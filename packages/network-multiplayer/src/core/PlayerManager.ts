import { EventEmitter } from 'events';
import { NetworkSyncEngine } from './NetworkSyncEngine';

export interface PlayerProfile {
  id: string;
  username: string;
  steamId?: string;
  level: number;
  experience: number;
  rank: PlayerRank;
  statistics: PlayerStatistics;
  preferences: PlayerPreferences;
  achievements: string[];
  joinDate: Date;
  lastSeen: Date;
  isOnline: boolean;
  currentSession?: GameSession;
}

export interface PlayerStatistics {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalPlayTime: number;
  averageScore: number;
  bestScore: number;
  killDeathRatio?: number;
  accuracyPercentage?: number;
  resourcesGathered?: number;
  buildingsConstructed?: number;
  unitsProduced?: number;
}

export interface PlayerPreferences {
  graphics: GraphicsSettings;
  audio: AudioSettings;
  controls: ControlSettings;
  gameplay: GameplaySettings;
  privacy: PrivacySettings;
}

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: string;
  fullscreen: boolean;
  vsync: boolean;
  antialiasing: boolean;
  shadows: boolean;
  particles: boolean;
}

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  voiceVolume: number;
  microphoneEnabled: boolean;
  pushToTalk: boolean;
}

export interface ControlSettings {
  mousesensitivity: number;
  invertMouse: boolean;
  keyBindings: { [action: string]: string };
  gamepadEnabled: boolean;
  gamepadSettings: any;
}

export interface GameplaySettings {
  difficulty: 'easy' | 'normal' | 'hard' | 'expert';
  autoSave: boolean;
  showTutorials: boolean;
  language: string;
  unitMetrics: 'metric' | 'imperial';
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  allowInvites: boolean;
  allowVoiceChat: boolean;
  allowTextChat: boolean;
}

export interface GameSession {
  sessionId: string;
  gameMode: string;
  startTime: Date;
  duration: number;
  players: string[];
  isHost: boolean;
  serverId: string;
  gameState: 'lobby' | 'playing' | 'paused' | 'ended';
}

export interface PlayerAction {
  id: string;
  playerId: string;
  type: PlayerActionType;
  timestamp: Date;
  data: any;
  sessionId: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  members: string[];
  leader: string;
  score: number;
  isAlive: boolean;
}

export type PlayerRank = 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';

export type PlayerActionType =
  | 'move' | 'attack' | 'build' | 'research' | 'trade' | 'chat' | 'vote' | 'pause'
  | 'surrender' | 'resource_transfer' | 'alliance' | 'declare_war';

export interface PlayerManagerConfig {
  maxPlayersPerGame: number;
  maxTeams: number;
  enableRanking: boolean;
  enableStatistics: boolean;
  sessionTimeout: number;
  actionHistorySize: number;
  autoTeamBalance: boolean;
}

export class PlayerManager extends EventEmitter {
  private players: Map<string, PlayerProfile>;
  private sessions: Map<string, GameSession>;
  private teams: Map<string, Team>;
  private actions: Map<string, PlayerAction[]>;
  private networkSync: NetworkSyncEngine;
  private config: PlayerManagerConfig;
  private sessionCleanupTimer?: NodeJS.Timeout;

  constructor(networkSync: NetworkSyncEngine, config: PlayerManagerConfig) {
    super();
    this.players = new Map();
    this.sessions = new Map();
    this.teams = new Map();
    this.actions = new Map();
    this.networkSync = networkSync;
    this.config = config;

    this.setupNetworkHandlers();
    this.startSessionCleanup();
  }

  // Player registration and management
  registerPlayer(playerData: Partial<PlayerProfile>): PlayerProfile {
    const player: PlayerProfile = {
      id: playerData.id || this.generatePlayerId(),
      username: playerData.username || `Player_${Date.now()}`,
      steamId: playerData.steamId,
      level: playerData.level || 1,
      experience: playerData.experience || 0,
      rank: playerData.rank || 'unranked',
      statistics: playerData.statistics || this.createDefaultStatistics(),
      preferences: playerData.preferences || this.createDefaultPreferences(),
      achievements: playerData.achievements || [],
      joinDate: playerData.joinDate || new Date(),
      lastSeen: new Date(),
      isOnline: true,
      currentSession: playerData.currentSession
    };

    this.players.set(player.id, player);
    this.emit('player_registered', player);

    // Sync with network
    this.networkSync.updateState(`player_${player.id}`, player, player.id);

    return player;
  }

  getPlayer(playerId: string): PlayerProfile | undefined {
    return this.players.get(playerId);
  }

  updatePlayer(playerId: string, updates: Partial<PlayerProfile>): PlayerProfile | null {
    const player = this.players.get(playerId);
    if (!player) return null;

    const updatedPlayer = { ...player, ...updates, lastSeen: new Date() };
    this.players.set(playerId, updatedPlayer);

    this.emit('player_updated', updatedPlayer);
    this.networkSync.updateState(`player_${playerId}`, updatedPlayer, playerId);

    return updatedPlayer;
  }

  removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    // Mark as offline and leave current session
    this.setPlayerOffline(playerId);
    if (player.currentSession) {
      this.leaveSession(playerId, player.currentSession.sessionId);
    }

    this.players.delete(playerId);
    this.emit('player_removed', player);

    return true;
  }

  setPlayerOnline(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.isOnline = true;
    player.lastSeen = new Date();
    this.players.set(playerId, player);

    this.emit('player_online', player);
    this.networkSync.updateState(`player_${playerId}`, player, playerId);

    return true;
  }

  setPlayerOffline(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.isOnline = false;
    player.lastSeen = new Date();
    this.players.set(playerId, player);

    this.emit('player_offline', player);
    this.networkSync.updateState(`player_${playerId}`, player, playerId);

    return true;
  }

  // Session management
  createSession(hostId: string, gameMode: string): GameSession {
    const sessionId = this.generateSessionId();
    const session: GameSession = {
      sessionId,
      gameMode,
      startTime: new Date(),
      duration: 0,
      players: [hostId],
      isHost: true,
      serverId: this.generateServerId(),
      gameState: 'lobby'
    };

    this.sessions.set(sessionId, session);

    // Update host player
    const host = this.players.get(hostId);
    if (host) {
      host.currentSession = session;
      this.players.set(hostId, host);
    }

    this.emit('session_created', session);
    this.networkSync.updateState(`session_${sessionId}`, session, hostId);

    return session;
  }

  joinSession(playerId: string, sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    const player = this.players.get(playerId);

    if (!session || !player) return false;

    if (session.players.length >= this.config.maxPlayersPerGame) {
      this.emit('session_full', { sessionId, playerId });
      return false;
    }

    if (session.players.includes(playerId)) {
      return true; // Already in session
    }

    // Leave current session if any
    if (player.currentSession) {
      this.leaveSession(playerId, player.currentSession.sessionId);
    }

    // Join new session
    session.players.push(playerId);
    player.currentSession = session;

    this.sessions.set(sessionId, session);
    this.players.set(playerId, player);

    this.emit('player_joined_session', { player, session });
    this.networkSync.updateState(`session_${sessionId}`, session, session.players[0]);

    // Auto-balance teams if enabled
    if (this.config.autoTeamBalance) {
      this.balanceTeams(sessionId);
    }

    return true;
  }

  leaveSession(playerId: string, sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    const player = this.players.get(playerId);

    if (!session || !player) return false;

    // Remove from session
    session.players = session.players.filter(id => id !== playerId);
    player.currentSession = undefined;

    this.sessions.set(sessionId, session);
    this.players.set(playerId, player);

    this.emit('player_left_session', { player, session });

    // End session if empty or transfer host
    if (session.players.length === 0) {
      this.endSession(sessionId);
    } else if (session.isHost) {
      // Transfer host to next player
      const newHost = this.players.get(session.players[0]);
      if (newHost && newHost.currentSession) {
        newHost.currentSession.isHost = true;
        this.players.set(session.players[0], newHost);
        this.emit('host_transferred', { oldHost: playerId, newHost: session.players[0], session });
      }
    }

    this.networkSync.updateState(`session_${sessionId}`, session, session.players[0] || 'system');
    return true;
  }

  startSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.gameState !== 'lobby') return false;

    session.gameState = 'playing';
    session.startTime = new Date();
    this.sessions.set(sessionId, session);

    this.emit('session_started', session);
    this.networkSync.updateState(`session_${sessionId}`, session, session.players[0]);

    return true;
  }

  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.gameState = 'ended';
    session.duration = Date.now() - session.startTime.getTime();

    // Update player statistics
    for (const playerId of session.players) {
      this.updatePlayerStatistics(playerId, session);
    }

    // Clean up player session references
    for (const playerId of session.players) {
      const player = this.players.get(playerId);
      if (player) {
        player.currentSession = undefined;
        this.players.set(playerId, player);
      }
    }

    this.sessions.delete(sessionId);
    this.emit('session_ended', session);

    return true;
  }

  // Team management
  createTeam(sessionId: string, teamName: string, leaderId: string): Team | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.players.includes(leaderId)) return null;

    const existingTeams = Array.from(this.teams.values()).filter(t =>
      t.members.some(memberId => session.players.includes(memberId))
    );

    if (existingTeams.length >= this.config.maxTeams) return null;

    const team: Team = {
      id: this.generateTeamId(),
      name: teamName,
      color: this.getTeamColor(existingTeams.length),
      members: [leaderId],
      leader: leaderId,
      score: 0,
      isAlive: true
    };

    this.teams.set(team.id, team);
    this.emit('team_created', { team, sessionId });
    this.networkSync.updateState(`team_${team.id}`, team, leaderId);

    return team;
  }

  joinTeam(playerId: string, teamId: string): boolean {
    const team = this.teams.get(teamId);
    const player = this.players.get(playerId);

    if (!team || !player || team.members.includes(playerId)) return false;

    // Leave current team if any
    this.leaveCurrentTeam(playerId);

    // Join new team
    team.members.push(playerId);
    this.teams.set(teamId, team);

    this.emit('player_joined_team', { playerId, team });
    this.networkSync.updateState(`team_${teamId}`, team, team.leader);

    return true;
  }

  leaveTeam(playerId: string, teamId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team || !team.members.includes(playerId)) return false;

    team.members = team.members.filter(id => id !== playerId);

    if (team.members.length === 0) {
      // Delete empty team
      this.teams.delete(teamId);
      this.emit('team_dissolved', team);
    } else {
      // Transfer leadership if necessary
      if (team.leader === playerId) {
        team.leader = team.members[0];
        this.emit('team_leader_changed', { team, newLeader: team.leader });
      }

      this.teams.set(teamId, team);
      this.networkSync.updateState(`team_${teamId}`, team, team.leader);
    }

    this.emit('player_left_team', { playerId, team });
    return true;
  }

  // Action tracking
  recordAction(playerId: string, actionType: PlayerActionType, data: any, sessionId: string): PlayerAction {
    const action: PlayerAction = {
      id: this.generateActionId(),
      playerId,
      type: actionType,
      timestamp: new Date(),
      data,
      sessionId
    };

    if (!this.actions.has(playerId)) {
      this.actions.set(playerId, []);
    }

    const playerActions = this.actions.get(playerId)!;
    playerActions.push(action);

    // Limit history size
    if (playerActions.length > this.config.actionHistorySize) {
      playerActions.splice(0, playerActions.length - this.config.actionHistorySize);
    }

    this.emit('action_recorded', action);
    this.networkSync.sendMessage('player_action', action, undefined, 'normal');

    return action;
  }

  getPlayerActions(playerId: string, limit?: number): PlayerAction[] {
    const actions = this.actions.get(playerId) || [];
    return limit ? actions.slice(-limit) : actions;
  }

  getSessionActions(sessionId: string): PlayerAction[] {
    const sessionActions: PlayerAction[] = [];

    for (const playerActions of this.actions.values()) {
      sessionActions.push(...playerActions.filter(action => action.sessionId === sessionId));
    }

    return sessionActions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Statistics and ranking
  updatePlayerStatistics(playerId: string, session: GameSession): void {
    const player = this.players.get(playerId);
    if (!player) return;

    player.statistics.gamesPlayed++;
    player.statistics.totalPlayTime += session.duration;

    // Update other stats based on session results (would be game-specific)
    this.calculatePlayerRank(playerId);

    this.players.set(playerId, player);
    this.emit('statistics_updated', player);
  }

  calculatePlayerRank(playerId: string): PlayerRank {
    const player = this.players.get(playerId);
    if (!player) return 'unranked';

    const stats = player.statistics;
    const winRate = stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0;
    const score = stats.averageScore;

    // Simple ranking algorithm
    if (stats.gamesPlayed < 10) return 'unranked';
    if (winRate < 0.3 || score < 1000) return 'bronze';
    if (winRate < 0.5 || score < 2000) return 'silver';
    if (winRate < 0.7 || score < 3000) return 'gold';
    if (winRate < 0.8 || score < 4000) return 'platinum';
    if (winRate < 0.9 || score < 5000) return 'diamond';
    if (winRate < 0.95 || score < 7500) return 'master';
    return 'grandmaster';
  }

  getLeaderboard(limit: number = 100): PlayerProfile[] {
    return Array.from(this.players.values())
      .filter(p => p.rank !== 'unranked')
      .sort((a, b) => {
        const rankOrder = {
          'grandmaster': 7, 'master': 6, 'diamond': 5, 'platinum': 4,
          'gold': 3, 'silver': 2, 'bronze': 1, 'unranked': 0
        };
        const rankDiff = rankOrder[b.rank] - rankOrder[a.rank];
        return rankDiff !== 0 ? rankDiff : b.statistics.averageScore - a.statistics.averageScore;
      })
      .slice(0, limit);
  }

  // Utility methods
  private setupNetworkHandlers(): void {
    this.networkSync.on('message_received', (message) => {
      if (message.type === 'player_action') {
        this.handleRemoteAction(message.data);
      }
    });
  }

  private handleRemoteAction(action: PlayerAction): void {
    this.emit('remote_action_received', action);
  }

  private startSessionCleanup(): void {
    this.sessionCleanupTimer = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Check every minute
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (session.gameState === 'lobby') {
        const lastActivity = session.startTime.getTime();
        if (now - lastActivity > this.config.sessionTimeout) {
          this.endSession(sessionId);
        }
      }
    }
  }

  private balanceTeams(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Simple auto-balance logic
    const sessionTeams = Array.from(this.teams.values()).filter(team =>
      team.members.some(memberId => session.players.includes(memberId))
    );

    if (sessionTeams.length < 2) return;

    // Redistribute players evenly
    const unassignedPlayers = session.players.filter(playerId =>
      !sessionTeams.some(team => team.members.includes(playerId))
    );

    for (const playerId of unassignedPlayers) {
      const smallestTeam = sessionTeams.reduce((smallest, current) =>
        current.members.length < smallest.members.length ? current : smallest
      );
      this.joinTeam(playerId, smallestTeam.id);
    }
  }

  private leaveCurrentTeam(playerId: string): void {
    for (const [teamId, team] of this.teams) {
      if (team.members.includes(playerId)) {
        this.leaveTeam(playerId, teamId);
        break;
      }
    }
  }

  private getTeamColor(index: number): string {
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
    return colors[index % colors.length];
  }

  private createDefaultStatistics(): PlayerStatistics {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      totalPlayTime: 0,
      averageScore: 0,
      bestScore: 0,
      killDeathRatio: 0,
      accuracyPercentage: 0,
      resourcesGathered: 0,
      buildingsConstructed: 0,
      unitsProduced: 0
    };
  }

  private createDefaultPreferences(): PlayerPreferences {
    return {
      graphics: {
        quality: 'medium',
        resolution: '1920x1080',
        fullscreen: true,
        vsync: true,
        antialiasing: true,
        shadows: true,
        particles: true
      },
      audio: {
        masterVolume: 0.8,
        musicVolume: 0.6,
        effectsVolume: 0.8,
        voiceVolume: 0.7,
        microphoneEnabled: true,
        pushToTalk: false
      },
      controls: {
        mousesensitivity: 1.0,
        invertMouse: false,
        keyBindings: {},
        gamepadEnabled: false,
        gamepadSettings: {}
      },
      gameplay: {
        difficulty: 'normal',
        autoSave: true,
        showTutorials: true,
        language: 'en',
        unitMetrics: 'metric'
      },
      privacy: {
        profileVisibility: 'public',
        showOnlineStatus: true,
        allowInvites: true,
        allowVoiceChat: true,
        allowTextChat: true
      }
    };
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateServerId(): string {
    return `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTeamId(): string {
    return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public query methods
  getOnlinePlayers(): PlayerProfile[] {
    return Array.from(this.players.values()).filter(p => p.isOnline);
  }

  getActiveSessions(): GameSession[] {
    return Array.from(this.sessions.values()).filter(s => s.gameState !== 'ended');
  }

  getPlayersByRank(rank: PlayerRank): PlayerProfile[] {
    return Array.from(this.players.values()).filter(p => p.rank === rank);
  }

  getTeamsInSession(sessionId: string): Team[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(this.teams.values()).filter(team =>
      team.members.some(memberId => session.players.includes(memberId))
    );
  }

  getPlayerTeam(playerId: string): Team | null {
    for (const team of this.teams.values()) {
      if (team.members.includes(playerId)) {
        return team;
      }
    }
    return null;
  }

  getManagerStats(): {
    totalPlayers: number;
    onlinePlayers: number;
    activeSessions: number;
    activeTeams: number;
    totalActions: number;
  } {
    const totalActions = Array.from(this.actions.values()).reduce((sum, actions) => sum + actions.length, 0);

    return {
      totalPlayers: this.players.size,
      onlinePlayers: this.getOnlinePlayers().length,
      activeSessions: this.getActiveSessions().length,
      activeTeams: this.teams.size,
      totalActions
    };
  }

  shutdown(): void {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
    }

    // End all active sessions
    for (const sessionId of this.sessions.keys()) {
      this.endSession(sessionId);
    }

    this.players.clear();
    this.sessions.clear();
    this.teams.clear();
    this.actions.clear();

    this.emit('shutdown');
  }
}