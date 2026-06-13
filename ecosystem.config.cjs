module.exports = {
  apps: [
    {
      name: 'dr-saleh-api',
      script: 'dist/src/main.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      time: true,
      error_file: '/var/log/dr-saleh-api/error.log',
      out_file: '/var/log/dr-saleh-api/out.log',
      merge_logs: true,
      kill_timeout: 5000,
    },
  ],
};
