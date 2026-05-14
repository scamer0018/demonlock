const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const config = require("./config");
const createBackup = require("./backup");

const bot = new Telegraf(config.BOT_TOKEN);

function loadDB() {
  return JSON.parse(fs.readFileSync("./database.json"));
}

function saveDB(data) {
  fs.writeFileSync("./database.json", JSON.stringify(data, null, 2));
}

function isAdmin(id) {
  return config.ADMINS.includes(id);
}

async function checkJoined(userId) {

  for (let channel of config.FORCE_CHANNELS) {

    try {

      let member = await bot.telegram.getChatMember(
        channel.username,
        userId
      );

      let status = member.status;

      if (
        status !== "member" &&
        status !== "administrator" &&
        status !== "creator"
      ) {
        return false;
      }

    } catch {
      return false;
    }

  }

  return true;
}

bot.start(async (ctx) => {

  const userId = ctx.from.id;

  let db = loadDB();

  if (!db.users.includes(userId)) {

    db.users.push(userId);

    db.stats.totalUsers = db.users.length;

    saveDB(db);
  }

  let buttons = [];

  for (let channel of config.FORCE_CHANNELS) {

    buttons.push([
      Markup.button.url(
        `📢 ${channel.username}`,
        channel.url
      )
    ]);

  }

  buttons.push([
    Markup.button.callback(
      "✅ Verify",
      "verify"
    )
  ]);

  await ctx.replyWithPhoto(
    config.WELCOME_IMAGE,
    {
      caption: config.WELCOME_TEXT,
      reply_markup: {
        inline_keyboard: buttons
      }
    }
  );

});

bot.action("verify", async (ctx) => {

  const joined = await checkJoined(ctx.from.id);

  if (!joined) {

    return ctx.answerCbQuery(
      "❌ Join All Channels First",
      { show_alert: true }
    );

  }

  let menuButtons = [];

  for (let row of config.BUTTONS) {

    let btnRow = [];

    for (let btn of row) {

      btnRow.push(
        Markup.button.url(
          btn.text,
          btn.url
        )
      );

    }

    menuButtons.push(btnRow);

  }

  await ctx.replyWithPhoto(
    config.VERIFIED_IMAGE,
    {
      caption: config.VERIFIED_TEXT,
      reply_markup: {
        inline_keyboard: menuButtons
      }
    }
  );

});

bot.command("stats", async (ctx) => {

  if (!isAdmin(ctx.from.id)) return;

  let db = loadDB();

  ctx.reply(
    `👥 Total Users: ${db.stats.totalUsers}`
  );

});

bot.command("backup", async (ctx) => {

  if (!isAdmin(ctx.from.id)) return;

  createBackup();

  await ctx.replyWithDocument({
    source: "./backups/database.zip"
  });

});

bot.command("broadcast", async (ctx) => {

  if (!isAdmin(ctx.from.id)) return;

  let message = ctx.message.text.split(" ").slice(1).join(" ");

  if (!message) {
    return ctx.reply("Send Message");
  }

  let db = loadDB();

  let success = 0;

  for (let userId of db.users) {

    try {

      await bot.telegram.sendMessage(
        userId,
        message
      );

      success++;

    } catch {}

  }

  ctx.reply(
    `✅ Broadcast Sent To ${success} Users`
  );

});

bot.launch();

console.log("Bot Running...");
