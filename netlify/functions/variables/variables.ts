import type { Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
    const myImportantVariable = process.env.MY_IMPORTANT_VARIABLE;

    if (!myImportantVariable) throw new Error("Missing variable");
    return new Response (myImportantVariable)
}
