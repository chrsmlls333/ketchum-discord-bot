module.exports = {
  apps : [{
    name: 'discord-downloader',
    script: 'index.js',

    // args: "",

    // instances: 1,
    autorestart: true,
    watch: true,
    //watch: [".", "configuration", "commands"],
    // watch_delay: 1000,
    //ignore_watch: ["node_modules", "logs", "debug_message.json"],

    max_memory_restart: '1G',

    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};

// Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/