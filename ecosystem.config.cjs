module.exports = {
  apps: [
    {
      name: "web",
      cwd: "/home/kasm-user/project",
      script: "npm",
      args: "start -- -p 3000 -H 0.0.0.0",
      pre_start: "npm run build:prod",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0"
      },
      exec_mode: "fork",
      instances: 1,
      max_restarts: 10,
      watch: false,
      out_file: "/home/kasm-user/project/logs/web.out.log",
      error_file: "/home/kasm-user/project/logs/web.err.log",
      merge_logs: true
    }
  ]
};
