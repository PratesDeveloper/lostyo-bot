const fs = require("fs");
const path = require("path");
const { public: pub } = require("../../config");
const log = require("../utils/logger");

module.exports = async (client) => {
  let count = 0;

  const load = (dir) => {
    try {
      fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);

        if (fs.statSync(fullPath).isDirectory()) {
          return load(fullPath);
        }
        if (!file.endsWith(".js")) return;

        try {
          const event = require(fullPath);

          if (!event.name || !event.execute) {
            log.warn(`Skip ${file}: Missing name or execute function`);
            return;
          }
          event.config = pub;
          event.logger = log;

          const listener = async (...args) => {
            try {
              await event.execute(...args, client, log);
            } catch (err) {
              log.error(`Error in event '${event.name}': ${err.stack || err}`);
            }
          };

          if (event.once) {
            client.once(event.name, listener);
          } else {
            client.on(event.name, listener);
          }

          count++;
          log.debug(`${file} OK!`);
        } catch (err) {
          log.error(`Failed to load event ${file}: ${err.stack || err.message}`);
        }
      });
    } catch (err) {
      log.error(`Error reading events directory: ${err.stack || err.message}`);
    }
  };

  load(path.join(__dirname, "../files/events"));

  log.success(`${count} Events OK!\n`);
};
