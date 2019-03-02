const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const Data = require("./data");
const Vote = require("./vote");
const Snake = require("./snake");

const API_PORT = 3001;
const app = express();
const router = express.Router();

// Database url.
const dbRoute = "mongodb://howarto:snacracy@snacracy-shard-00-00-llqio.mongodb.net:27017,snacracy-shard-00-01-llqio.mongodb.net:27017,snacracy-shard-00-02-llqio.mongodb.net:27017/test?ssl=true&replicaSet=snacracy-shard-0&authSource=admin&retryWrites=true";

// Used to have access to snake coordinates.
let snakeID;

// Connection with the db.
mongoose.connect(
  dbRoute,
  { useNewUrlParser: true }, () => {
    mongoose.connection.db.dropCollection('snakes', function(err, result) {
      if (err) console.log('Snakes collection was not deleted');
      else console.log('Snakes collection deleted');
      const snake = new Snake();
      snake.coords = [{x: 150, y: 150}];
    
      snake.save(err => {
        if (err) console.log('ERROR' + ':' + 'Interval it was not saved.');
        return console.log('VERBOSE' + ':' + 'Interval was created.');
      });
      snakeID = snake._id;
    });

    mongoose.connection.db.dropCollection('votes', function(err, result) {
      if (err) console.log('Votes collection was not deleted');
      else console.log('Votes collection deleted');
    });

    mongoose.connection.db.dropCollection('datas', function(err, result) {
      if (err) console.log('Datas collection was not deleted');
      else console.log('Datas collection deleted');
    });
  }
);

let db = mongoose.connection;

// Open the connection.
db.once("open", () => console.log("connected to the database"));

// Handle connection error.
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// bodyParser, parses the request body to be a readable json format.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(logger("dev"));

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

router.get("/getSnakes", (req, res) => {
  Snake.find((err, data) => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true, data: data });
  });
});

router.get("/getVotes", (req, res) => {
  Vote.find((err, data) => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true, data: data });
  });
});

router.get("/getTimestamps", (req, res) => {
  Data.find((err, data) => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true, data: data });
  });
});

router.post("/putVote", (req, res) => {
  let data = new Vote();
  const { message } = req.body;

  if (!message) {
    return res.json({
      success: false,
      error: "INVALID INPUTS"
    });
  }
  data.message = message;
  data.save(err => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true });
  });
});

const SQUARE_PART_SIZE = 10;

/**
 * Move the snake in x and y axis.
 * @param {Object[]} coords - Snake's parts.
 * @param {Number} xIncrease - x axis increase.
 * @param {Number} yIncrease - y axis increase.
 */
function goSomewhere(coords, xIncrease, yIncrease) {
  const head = { x: coords[0].x + xIncrease, y: coords[0].y + yIncrease };
  coords.unshift(head);
  console.log(coords);
  Snake.findOneAndUpdate({ _id: snakeID }, { $set: { coords } }, (err, data) => {
    if (err) console.log(err);
  });
}

function goUp() {
  Snake.find((err, data) => {
    if (err) console.log(err);
    goSomewhere(data[0].coords, 0, -SQUARE_PART_SIZE);
  });
}

function goDown() {
  Snake.find((err, data) => {
    if (err) console.log(err);
    goSomewhere(data[0].coords, 0, SQUARE_PART_SIZE);
  });
}

function goLeft() {
  Snake.find((err, data) => {
    if (err) console.log(err);
    goSomewhere(data[0].coords, -SQUARE_PART_SIZE, 0);
  });
}

function goRight() {
  Snake.find((err, data) => {
    if (err) console.log(err);
    goSomewhere(data[0].coords, SQUARE_PART_SIZE, 0);
  });
}


let lastDate = new Date();
setInterval(() => {
  const data = new Data();
  data.id = 1;
  data.message = 'Time interval!';

  data.save(err => {
    if (err) console.log('ERROR' + ':' + 'Interval it was not saved.');
  });

  const currentDate = new Date(data._id.getTimestamp());

  Vote.find((err, data) => {
    if (err) return res.json({ success: false, error: err });

    // Represents up, down, left and right sum.
    let arrayMapping = [0, 0, 0, 0];
    for (const iterator of data) {
      const timestamp = iterator.createdAt;
      if (lastDate <= timestamp && timestamp <= currentDate) {
        switch (iterator.message) {
          case 'up':
            arrayMapping[0]++;
            break;
          case 'down':
          arrayMapping[1]++;
            break;
          case 'left':
          arrayMapping[2]++;
            break;
          case 'right':
          arrayMapping[3]++;
            break;
          default:
            break;
        }
      }
    }
    lastDate = currentDate;

    const winnerIndex = arrayMapping.indexOf(Math.max(...arrayMapping));
    // Stay in the same position if there are not votes.
    if (arrayMapping[winnerIndex] !== 0) {
      switch (winnerIndex) {
        case 0:
          goUp();
          break;
        
        case 1:
          goDown();
          break;
        
        case 2:
          goLeft();
          break;
  
        case 3:
          goRight();
          break;
      
        default:
          break;
      }
    }
  });
}, 2000);

// Use the path /api for our requests.
app.use("/api", router);

// Listen.
app.listen(API_PORT, () => console.log(`LISTENING ON PORT ${API_PORT}`));