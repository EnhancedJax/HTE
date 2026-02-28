import queryDeepSeek from "./deepseekPortal";
import queryExa from "./exaPortal";

const PROCESS_RESPONSE_PROMPTS = {
  extractTopics: (query: string) =>
    `Given the following question: ${query}\nPlease break it down and extract a list of 5 relevant topics/keywords, each topic being only 3 words max.\nGive it in the format: Topic 1, Topic 2, Topic 3,....`,
  extractSubquestions: (topic: string) =>
    `Given the following topic: ${topic}\nGenerate a list of relevant 3 diverse sub-questions that would help explore this topic in depth. Each question should be concise and focused on a specific aspect of the topic.\nGive it in a list delimited by |, don't number the questions, just give the raw list`,
  exaWebSearch: (query: string, topic: string, subquestion: string) =>
    `${query}\nwith an emphasis on ${topic}, specifically regarding ${subquestion}.`,
};

class EXA_SEARCH_RESULT {
  url: string;
  title: string;
  highlight: string;
  image: string;

  constructor(url: string, title: string, highlight: string, image?: string) {
    this.url = url;
    this.title = title;
    this.highlight = highlight;
    this.image = image || "";
  }
}

export default async function processUserQuery(query: string) {
  const results: { "Relevant Topics": string[]; Results: any } = {
    "Relevant Topics": [],
    Results: {},
  };

  // Step 1: Extract topics
  const topics_results = await queryDeepSeek(
    PROCESS_RESPONSE_PROMPTS.extractTopics(query),
  );
  const topics = topics_results
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  results["Relevant Topics"] = topics;

  // Step 2: Extract subquestions for all topics in parallel
  const subquestionsList: string[][] = await Promise.all(
    topics.map((topic: string) =>
      queryDeepSeek(PROCESS_RESPONSE_PROMPTS.extractSubquestions(topic)).then(
        (res: string) =>
          res
            .split("|")
            .map((q: string) => q.trim())
            .filter((q: string) => q.length > 0),
      ),
    ),
  );

  // Step 3: Run all Exa searches across all topics × subquestions in parallel
  await Promise.all(
    topics.map(async (topic: string, topicIdx: number) => {
      results.Results[topic] = {};
      const subquestions = subquestionsList[topicIdx]!;
      await Promise.all(
        subquestions.map(async (subquestion: string) => {
          const answer_results = await queryExa(
            PROCESS_RESPONSE_PROMPTS.exaWebSearch(query, topic, subquestion),
            5,
            "Highlight the most relevant information and insights related to the query, focusing on recent developments and key facts.",
            3000,
          );
          const answers: EXA_SEARCH_RESULT[] = answer_results.results.map(
            (item: any) =>
              new EXA_SEARCH_RESULT(
                item.id,
                item.title || "No title",
                item.highlights?.[0],
                item.image,
              ),
          );
          results.Results[topic][subquestion] = answers;
        }),
      );
    }),
  );

  return JSON.stringify(results);
}
