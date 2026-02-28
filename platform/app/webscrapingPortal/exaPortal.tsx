import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY ?? "");

export default async function queryExa(
  query: string,
  numResults?: number,
  guidance?: string,
  maxChar?: number,
) {
  const result = await exa.search(query, {
    numResults: numResults || 5,
    type: "auto",
    contents: {
      highlights: {
        query: guidance || "",
        maxCharacters: maxChar || 3000,
      },
    },
  });
  return result;
}
