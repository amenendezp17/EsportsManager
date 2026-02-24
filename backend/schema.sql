-- Tabla de usuarios (ya existe en Supabase Auth, pero necesita tabla de perfiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('player', 'manager', 'admin')),
  avatar_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de equipos
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(3) NOT NULL,
  logo_url VARCHAR(500),
  description TEXT,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game VARCHAR(50) NOT NULL CHECK (game IN ('lol', 'valorant', 'inazuma')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_manager_per_game UNIQUE (manager_id, game)
);

-- Tabla de jugadores
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  game VARCHAR(50) NOT NULL CHECK (game IN ('lol', 'valorant', 'inazuma')),
  role VARCHAR(50),
  rank VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de torneos
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  game VARCHAR(50) NOT NULL CHECK (game IN ('lol', 'valorant', 'inazuma')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'open', 'in_progress', 'finished')),
  participants INTEGER NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  has_price_pool BOOLEAN DEFAULT FALSE,
  first_place VARCHAR(255),
  second_place VARCHAR(255),
  third_place VARCHAR(255),
  challonge_url VARCHAR(500),
  description TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de solicitudes para unirse a equipos
CREATE TABLE IF NOT EXISTS team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, team_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_teams_game ON teams(game);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_game ON players(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_creator_id ON tournaments(creator_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_player_id ON team_join_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON team_join_requests(team_id);

-- Habilitar RLS (Row Level Security) - IMPORTANTE para Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuarios
-- Solo los usuarios autenticados pueden ver el contenido
CREATE POLICY "Los usuarios pueden ver su propio perfil"
ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
ON users FOR UPDATE USING (auth.uid() = id);

-- Políticas RLS para equipos
CREATE POLICY "Cualquiera puede ver equipos"
ON teams FOR SELECT USING (true);

CREATE POLICY "Los managers y admins pueden crear equipos"
ON teams FOR INSERT WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Los managers pueden actualizar sus equipos"
ON teams FOR UPDATE USING (manager_id = auth.uid());

CREATE POLICY "Los managers pueden eliminar sus equipos"
ON teams FOR DELETE USING (manager_id = auth.uid());

-- Políticas RLS para jugadores
CREATE POLICY "Cualquiera puede ver jugadores"
ON players FOR SELECT USING (true);

CREATE POLICY "Los users pueden crear su perfil de jugador"
ON players FOR INSERT WITH CHECK (user_id = auth.uid());

-- Políticas RLS para torneos
CREATE POLICY "Cualquiera puede ver torneos"
ON tournaments FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden crear torneos"
ON tournaments FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND creator_id = auth.uid()
);

CREATE POLICY "Los creadores pueden actualizar sus torneos"
ON tournaments FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Los creadores pueden eliminar sus torneos"
ON tournaments FOR DELETE USING (creator_id = auth.uid());

-- Políticas RLS para solicitudes de equipos
CREATE POLICY "Cualquiera puede ver solicitudes"
ON team_join_requests FOR SELECT USING (true);

CREATE POLICY "Los jugadores pueden crear solicitudes"
ON team_join_requests FOR INSERT WITH CHECK (player_id = auth.uid());

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_join_requests_updated_at BEFORE UPDATE ON team_join_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
