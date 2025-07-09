module.exports = {
  apps: [    {
      name: 'malikli-backend',
      cwd: '/home/deployuser/Malikli-son---Preview/',
      script: './start-backend.sh',
      env: {
        NODE_ENV: 'production',
        DJANGO_SETTINGS_MODULE: 'backend.settings'
      },
      error_file: '/var/log/pm2/malikli-backend-error.log',
      out_file: '/var/log/pm2/malikli-backend-out.log',
      log_file: '/var/log/pm2/malikli-backend.log',
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'malikli-frontend',
      cwd: '/home/deployuser/Malikli-son---Preview//frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/malikli-frontend-error.log',
      out_file: '/var/log/pm2/malikli-frontend-out.log',
      log_file: '/var/log/pm2/malikli-frontend.log',
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
