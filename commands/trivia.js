const snekfetch = require("snekfetch")
const h2p = require("html2plaintext")
const stringSim = require("string-similarity")
const cur = {};

let categories = {
  "general knowledge": 9,
  books: 10,
  film: 11,
  music: 12,
  musicals: 13,
  television: 14,
  "video games": 15,
  "board games": 16,
  science: 17,
  computers: 18,
  mathematics: 19,
  mythology: 20,
  sports: 21,
  geography: 22,
  history: 23,
  politics: 24,
  art: 25,
  celebrities: 26,
  animals: 27,
  vehicles: 28,
  comics: 29,
  gadgets: 30,
  anime: 31,
  cartoons: 32
}

exports.run = (message, bot, send) => {
  if (message.suffix === "categories") {
    return send("**Available Categories:**\n" + Object.keys(categories).join(", "))
  }
  let diff = message.args[0] || "random"
  let cat = message.args[1] || "random"

  snekfetch.get(genUrl(diff, cat)).then(response => {
    let res = response.body
    if (res.response_code !== 0 || !res.results || !res.results[0]) return send("Api Error")
    let trivia = res.results[0]
    if (!trivia.question ||
      !trivia.correct_answer ||
      !trivia.difficulty ||
      !trivia.category) return send("Api Error")

    trivia.worth = {
      "easy": 20,
      "medium": 50,
      "hard": 100
    }[trivia.difficulty] || 0

    play(message, bot, send, trivia)

  }).catch(e => {
    console.log(e)
    return send("Api Error")
  })
}

exports.conf = {
  userPerm: [],
  botPerm: ["SEND_MESSAGES", "EMBED_LINKS"],
  coolDown: 0,
  dm: false,
  category: "Fun",
  help: "I'll ask a trivia question in chat. Options `n!trivia <diff> <category>` diff = easy, medium, hard, random - category = see category list with `n!trivia categories`",
  args: "",
}


async function play(message, bot, send, trivia) {
  if (cur[message.channel.id]) return send("A game is in progress")
  cur[message.channel.id] = true;
  let {
    question,
    correct_answer,
    difficulty,
    category,
    worth
  } = trivia
  correct_answer = h2p(correct_answer)

  let embed = new bot.embed()
  embed.title = "`Trivia`"
  embed.addField("Question", h2p(question))
    .addField("Category", category)
    .addField("Difficulty", difficulty)
    .addField("Reward", worth + ":dollar:")
    .setFooter("You have 30 seconds to answer.")
    .setColor("#4DD0D9")
    .setAuthor(message.guild.name, message.guild.iconURL)

  send({
    embed
  })

  let collector = message.channel.createMessageCollector(m => {
    if (m.author.bot) return false
    if (checkAnswer(correct_answer, m.content)) {
      collector.stop("WINNED")
      win(bot, message, m.author, worth)
    }
    return false
  }, {
    time: 30000
  })

  collector.on("end", (c, reason) => {
    delete cur[message.channel.id]
    if (reason === "time") {
      return send("**Noone guessed in time, the correct answer was: " + correct_answer + "**");
    }
  })
}

function win(bot, message, user, worth) {
  delete cur[message.channel.id]
  message.send(`**${user.tag} answered the question correctly, here is your reward.**`)
  bot.profile.addMoney(user.id, worth);
}

function checkAnswer(correct, input) {
  let c = correct.toLowerCase()
  let i = input.toLowerCase()
  if (stringSim.compareTwoStrings(c, i) > .7) return true
  else return false
}

function genUrl(d, c) {
  if (d !== "easy" && d !== "medium" && d !== "hard" && d !== "random")
    d = "random";
  if (!categories[c]) c = "random";
  let diff = d === "random" ? "" : "&difficulty=" + d
  let cat = c === "random" ? "" : "&category=" + (categories[c])
  return `https://opentdb.com/api.php?amount=1${cat}${diff}&type=multiple`
}