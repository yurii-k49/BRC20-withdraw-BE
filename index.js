import "dotenv/config";
import express from 'express';
import cors from "cors";
// import Socket from "blockchain.info/Socket/index.js";
import mongoose from "mongoose";
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import bodyParser from "body-parser";
import routes from "./routes.js";
import InscribeSchema from "./model.js";
import { SERVER_URL } from "./config.js";

const app = express();
// const mySocket = new Socket({ network: 3 });

app.use(cors({
    origin: "*"
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
    .connect(process.env.MONGO_URI || "")
    .then(async () => {
        console.log("Connected to the database! ❤️");
        // set port, listen for requests
        const inscribeSchema = await InscribeSchema.findOne({ arrayNumber: 1 });
        if (inscribeSchema === null) {
            const newSchema = new InscribeSchema({
                arrayNumber: 1,
                inscribes: []
            });
            newSchema.save();
        }

        const PORT = 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.log("Cannot connect to the database! 😭", err);
        process.exit();
    });

// app.get('/', (request, response) => {
//     response.send('<h1>Phonebook</h1>')
// });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, "./frontend")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "./frontend/index.html")));

app.use("/api", routes);
