export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'guildtide-dev-secret',
  jwtExpiresIn: '7d',
};
