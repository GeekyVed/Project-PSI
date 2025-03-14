require('dotenv').config();
import express from "express";

import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BASE_PROMPT, getSystemPrompt } from "./prompt";
import { basePrompt as nodeBasePrompt } from "./defaults/node";
import { basePrompt as reactBasePrompt } from "./defaults/react";
import cors from "cors";

const app = express();
app.use(express.json())
app.use(cors());

function escapeBraces(str: string) {
    return str.replace(/{/g, '{{').replace(/}/g, '}}');
}

app.get("/test", (req, res) => {
    res.json({ message: "Hello World" });
});

app.post("/template", async (req, res) => {
    const userPrompt = req.body.prompt;

    const model = new ChatMistralAI({
        model: "mistral-large-latest",
        temperature: 0.1,
        maxTokens: 8000,
    });

    const checkProjectType = ChatPromptTemplate.fromMessages([
        ["system", "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra"],
        ["human", userPrompt],
    ]);

    const chain = checkProjectType.pipe(model);

    const response = await chain.invoke({});

    const answer = response.content;

    if (answer == "react") {
        res.json({
            // This prompt is for llm so more context
            basePrompt: BASE_PROMPT,
            filePrompt: `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,

            // This one is for frontend so we can make all the files and struture and and everything, thats why passing same thing twice
            uiPrompts: reactBasePrompt
        })
        return;
    }

    if (answer === "node") {
        res.json({
            basePrompt: BASE_PROMPT,
            filePrompt: `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
            uiPrompts: nodeBasePrompt
        })
        return;
    }

    res.status(403).json({ message: "Cannot build this type of Application" })
    return;

});

app.post("/chat", async (req, res) => {
    const basePrompt = escapeBraces(req.body.basePrompt ?? "");
    const filePrompt = escapeBraces(req.body.filePrompt ?? "");
    const userPrompt = escapeBraces(req.body.userPrompt ?? "");
    const systemPrompt = escapeBraces(getSystemPrompt());

    const reiteratePrompt = Array.isArray(req.body.reiteratePrompt) 
    ? req.body.reiteratePrompt.map((msg:string )=> escapeBraces(msg)) 
    : [];    

    const reiterateMessages = reiteratePrompt.map((msg:string) => ["system", msg]);

    // const model = new ChatGroq({
    //     apiKey: process.env.GROQ_API_KEY,
    //     modelName: "llama3-70b-8192",
    //     maxTokens: 8000,
    //     stop: [], // Prevent early truncation
    //     temperature: 0.1
    // });

    const model = new ChatMistralAI({
        model: "mistral-large-latest",
        temperature: 0.1,
        maxTokens: 8000,
    });

    const chatPrompt = ChatPromptTemplate.fromMessages([
        ["system", "You MUST generate responses between 4000-8000 tokens. Make the componenets extremely beautiful" + systemPrompt],
        ["human", basePrompt],
        ["human", filePrompt],
        ["human", userPrompt],
        ...reiterateMessages
    ]);

    const chain = chatPrompt.pipe(model);

    const response = await chain.invoke({});

    res.json({
        response: (response.content)
    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

