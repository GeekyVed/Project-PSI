"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const mistralai_1 = require("@langchain/mistralai");
const prompts_1 = require("@langchain/core/prompts");
const prompt_1 = require("./prompt");
const node_1 = require("./defaults/node");
const react_1 = require("./defaults/react");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const mistralModel = new mistralai_1.ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0.1,
});
app.post("/template", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userPrompt = req.body.prompt;
    const checkProjectType = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"],
        ["human", userPrompt],
    ]);
    const chain = checkProjectType.pipe(mistralModel);
    const response = yield chain.invoke({});
    const answer = response.content;
    if (answer == "react") {
        res.json({
            prompts: [prompt_1.BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [react_1.basePrompt]
        });
        return;
    }
    if (answer === "node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [node_1.basePrompt]
        });
        return;
    }
    res.status(403).json({ message: "Cannot build this type of Application" });
    return;
}));
app.post("/chat", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const messages = req.body.messages;
    const chatPrompt = prompts_1.ChatPromptTemplate.fromMessages([
        ["system", (0, prompt_1.getSystemPrompt)()],
        ["human", messages],
    ]);
    const chain = chatPrompt.pipe(mistralModel);
    const response = yield chain.invoke({});
    console.log(response);
    res.json({
        response: (response.content)
    });
}));
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
