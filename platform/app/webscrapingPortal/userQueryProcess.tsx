import queryDeepSeek from "./deepseekPortal";
import queryExa from "./exaPortal";

const PROCESS_RESPONSE_PROMPTS = {
    "extractTopics": (query: string) => `Given the following question: ${query}\nPlease break it down and extract a list of 5 relevant topics/keywords, each topic being only 3 words max.\nGive it in the format: Topic 1, Topic 2, Topic 3,....`,
    "extractSubquestions": (topic: string) => `Given the following topic: ${topic}\nGenerate a list of relevant 3 diverse sub-questions that would help explore this topic in depth. Each question should be concise and focused on a specific aspect of the topic.\nGive it in a list delimited by |, don't number the questions, just give the raw list`,  
    "exaWebSearch": (query: string, topic: string, subquestion:string) => `${query}\nwith an emphasis on ${topic}, specifically regarding ${subquestion}.`
}

class EXA_SEARCH_RESULT {
    url: string;
    title: string
    highlight: string;
    image: string;

    constructor(url: string, title:string, highlight:string, image?: string) {
        this.url = url;
        this.title = title;
        this.highlight = highlight;
        this.image = image || "";
    }
}

export default async function processUserQuery(query: string) {
    const results: { "Relevant Topics": string[]; "Results": any } = {
        "Relevant Topics": [],
        "Results": {}
    };

    //larger topic breakdown
    const topics_results = await queryDeepSeek(PROCESS_RESPONSE_PROMPTS.extractTopics(query));
    const topics = topics_results.split(",").map((t: string) => t.trim());
    results["Relevant Topics"] = topics;

    //topic subquestion breakdown
    for (const topic of topics) {
        results.Results[topic] = {};
        const subquestions_results = await queryDeepSeek(PROCESS_RESPONSE_PROMPTS.extractSubquestions(topic));
        const subquestions = subquestions_results.split("|").map((q: string) => q.trim());
        console.log(subquestions);

        for (const subquestion of subquestions) {
            results.Results[topic][subquestion] = [];
            const answers : EXA_SEARCH_RESULT[] = [];
            const answer_results = await queryExa(PROCESS_RESPONSE_PROMPTS.exaWebSearch(query, topic, subquestion), 10, "Highlight the most relevant information and insights related to the query, focusing on recent developments and key facts.", 3000);
            for (const item of answer_results.results) {
                const temp_result = new EXA_SEARCH_RESULT(
                    item.id,
                    item.title || "No title",
                    item.highlights?.[0], 
                    item.image,
                );
                // console.log(temp_result);
                answers.push(temp_result);
            };
            results.Results[topic][subquestion] = answers;
        }
    }

    console.log(JSON.stringify(results));
    return JSON.stringify(results);
}

processUserQuery("What is the situation for the war in Gaza?").then(console.log).catch(console.error);
