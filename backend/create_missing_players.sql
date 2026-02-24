
INSERT INTO players (user_id, game, role, rank, team_id)
SELECT 
  u.id as user_id,
  g.game,
  NULL as role,
  NULL as rank,
  NULL as team_id
FROM 
  users u
  CROSS JOIN (
    SELECT 'lol' as game
    UNION ALL SELECT 'valorant'
    UNION ALL SELECT 'inazuma'
  ) g
WHERE 
  u.role = 'player'
  AND NOT EXISTS (
    SELECT 1 
    FROM players p 
    WHERE p.user_id = u.id AND p.game = g.game
  );

-- Verificar cuántos jugadores se crearon
SELECT COUNT(*) as total_players FROM players;

-- Verificar jugadores por juego
SELECT game, COUNT(*) as count 
FROM players 
GROUP BY game 
ORDER BY game;
