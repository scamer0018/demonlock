const fs = require("fs");
const archiver = require("archiver");

function createBackup() {

  if (!fs.existsSync("./backups")) {
    fs.mkdirSync("./backups");
  }

  const output = fs.createWriteStream("./backups/database.zip");

  const archive = archiver("zip", {
    zlib: { level: 9 }
  });

  archive.pipe(output);

  archive.file("./database.json", {
    name: "database.json"
  });

  archive.finalize();

}

module.exports = createBackup;
