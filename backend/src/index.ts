require('dotenv').config();
import express from "express";

import { ChatMistralAI } from "@langchain/mistralai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BASE_PROMPT, getSystemPrompt } from "./prompt";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";

const app = express();
app.use(express.json())

const mistralModel = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0.1,

});

app.post("/template", async (req, res) => {
    const userPrompt = req.body.prompt;

    const checkProjectType = ChatPromptTemplate.fromMessages([
        ["system", "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"],
        ["human", userPrompt],
    ]);

    const chain = checkProjectType.pipe(mistralModel);

    const response = await chain.invoke({});

    const answer = response.content;

    if (answer == "react") {
        res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [reactBasePrompt]
        })
        return;
    }

    if (answer === "node") {
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [nodeBasePrompt]
        })
        return;
    }

    res.status(403).json({ message: "Cannot build this type of Application" })
    return;

});

app.post("/chat", async (req, res) => {
    const messages = req.body.messages;

    const chatPrompt = ChatPromptTemplate.fromMessages([
        ["system", getSystemPrompt()],
        ["human", messages],
    ]);

    const chain = chatPrompt.pipe(mistralModel);

    const response = await chain.invoke({});

    console.log(response);

    res.json({
        response: (response.content)
    });
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

