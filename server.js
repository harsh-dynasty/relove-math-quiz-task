const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { math_questions } = require("./mathQuestions.json");
const { v4: getUniqueQuizId } = require("uuid");
const path = require("path");

const total_questions = math_questions.length;

const quizes = {};
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "build")));
app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      callback(null, true);
    },
  })
);

const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: ["http://localhost:3001"],
//     // allowedHeaders: ["my-custom-header"],
//     credentials: true,
//   },
// });

const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log("a user connected");
});

const port = process.env.PORT || 4000;
httpServer.listen(port, () => console.log(`Server running at port ${port}`));

const getQuestionByIndex = (index) => {
  const { sQuestion } = math_questions[index];
  return sQuestion;
};

const verifySolution = (index, answer) => {
  const { lSolutions } = math_questions[index];
  const solution = lSolutions[0];
  return solution == answer;
};

app.get("/", (req, res) => {
  res.json({ message: "Success" });
});

app.get("/getRandomQuestion", (req, res) => {
  const index = Math.floor(Math.random() * total_questions);
  res.json({ id: index, question: getQuestionByIndex(index) });
});

app.post("/verifySolution", (req, res) => {
  //here instead of taking username in request we can first set a cookie(while starting quiz) containing username details and then take that cookie in every further request ans extract username from it
  const { id, answer, username, quizId } = req.body;
  const isCorrect = verifySolution(id, answer);
  quizes[quizId] = quizes[quizId].map((user) => {
    if (username == user.username && isCorrect) user.correctAnsCount += 1;
    return user;
  });
  res.json({ isCorrect });
});

app.post("/joinQuiz", (req, res) => {
  const { username, quizId } = req.body;
  if (quizes[quizId]) {
    quizes[quizId].push({ username, correctAnsCount: 0 });
    res.json({ message: "Success" });
  } else res.json({ message: "Quiz not found" });
});

app.post("/createQuiz", (req, res) => {
  const { username, timeout } = req.body;

  if (!timeout || !username) res.sendStatus(500);
  const quizId = getUniqueQuizId();
  var users = [];
  users.push({ username, correctAnsCount: 0 });
  quizes[quizId] = users;
  setTimeout(() => {
    endQuiz(quizId);
  }, 1000 * 60 * Number(timeout));
  res.json({ id: quizId });
});

const endQuiz = (quizId) => {
  const users = quizes[quizId];
  delete quizes[quizId];
  var maxCount = 0;
  var winnerName = "";
  users.forEach((user, index) => {
    if (index == 0) winnerName = user.username;
    if (user.correctAnsCount > maxCount) winnerName = user.username;
  });
  console.log("winnerName->", winnerName);
  io.emit("quiz-timeout", { winnerName, id: quizId });
};
