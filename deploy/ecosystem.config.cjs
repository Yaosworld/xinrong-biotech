module.exports = {
  apps: [
    {
      name: 'xrsimple-server',
      cwd: '/srv/xrsimple/server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/srv/xrsimple/server/error.log',
      out_file: '/srv/xrsimple/server/out.log',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        CMS_DB_PATH: '/srv/xrsimple/server/data/cms.db',
        UPLOAD_PATH: '/srv/xrsimple/server/uploads',
        JWT_SECRET: 'replace-with-a-strong-random-secret'
      }
    }
  ]
}
