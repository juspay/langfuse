import { describe, expect, it } from "vitest";
import { extractJsonFromLLMResponse } from "@langfuse/shared/src/server";

describe("extractJsonFromLLMResponse", () => {
  it("returns raw JSON as-is when already valid", () => {
    const input = '{"score": 9, "reasoning": "All good"}';
    expect(extractJsonFromLLMResponse(input)).toBe(input);
  });

  it("returns raw JSON with nested objects", () => {
    const input = '{"a": {"b": [1, 2, 3]}, "c": true}';
    expect(extractJsonFromLLMResponse(input)).toBe(input);
  });

  it("extracts JSON from markdown code block with json tag", () => {
    const input = '```json\n{"score": 5, "reasoning": "minor error"}\n```';
    expect(extractJsonFromLLMResponse(input)).toBe(
      '{"score": 5, "reasoning": "minor error"}',
    );
  });

  it("extracts JSON from markdown code block without json tag", () => {
    const input = '```\n{"score": 3}\n```';
    expect(extractJsonFromLLMResponse(input)).toBe('{"score": 3}');
  });

  it("extracts JSON after markdown headers", () => {
    const input =
      '## Analysis\n\nHere is my evaluation:\n\n{"detected_phonetic_errors": ["None"], "reasoning": "Clean", "score": 10}';
    expect(extractJsonFromLLMResponse(input)).toBe(
      '{"detected_phonetic_errors": ["None"], "reasoning": "Clean", "score": 10}',
    );
  });

  it("extracts JSON with text before and after", () => {
    const input = 'Some preamble text.\n{"score": 7}\nSome trailing text.';
    expect(extractJsonFromLLMResponse(input)).toBe('{"score": 7}');
  });

  it("extracts JSON with hash headers (## Analysis)", () => {
    const input =
      '## Analysis\n\nThe transcript looks clean.\n\n```json\n{"score": 9}\n```';
    expect(extractJsonFromLLMResponse(input)).toBe('{"score": 9}');
  });

  it("handles JSON with escaped quotes inside strings", () => {
    const input = '{"reasoning": "User said \\"hello\\" and confirmed"}';
    expect(extractJsonFromLLMResponse(input)).toBe(input);
  });

  it("handles JSON with braces inside strings (not counting depth)", () => {
    const input = '{"text": "use {curly} braces"}';
    expect(extractJsonFromLLMResponse(input)).toBe(input);
  });

  it("returns null for text with no JSON", () => {
    const input = "This is just plain text with no JSON at all.";
    expect(extractJsonFromLLMResponse(input)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractJsonFromLLMResponse("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(extractJsonFromLLMResponse("   \n\t  ")).toBeNull();
  });

  it("returns null for incomplete JSON", () => {
    const input = '{"score": 9, "reasoning":';
    expect(extractJsonFromLLMResponse(input)).toBeNull();
  });

  it("returns null for markdown code block with non-JSON content", () => {
    const input = "```javascript\nconsole.log('hello');\n```";
    expect(extractJsonFromLLMResponse(input)).toBeNull();
  });

  it("extracts first valid JSON object when multiple exist", () => {
    const input = '{"a": 1} {"b": 2}';
    expect(extractJsonFromLLMResponse(input)).toBe('{"a": 1}');
  });

  it("handles JSON with special characters in values", () => {
    const input =
      '{"reasoning": "User said यस (yes) in Hindi transliteration"}';
    expect(extractJsonFromLLMResponse(input)).toBe(input);
  });

  it("handles JSON with newlines inside string values", () => {
    const input = '{"reasoning": "line1\\nline2\\nline3", "score": 8}';
    expect(extractJsonFromLLMResponse(input)).toBe(input);
  });

  it("extracts from response starting with # (markdown header)", () => {
    const input =
      '# Evaluation Result\n\n{"detected_phonetic_errors": [], "score": 10, "reasoning": "No issues"}';
    expect(extractJsonFromLLMResponse(input)).toBe(
      '{"detected_phonetic_errors": [], "score": 10, "reasoning": "No issues"}',
    );
  });

  it("extracts from response starting with backtick (code fence)", () => {
    const input = '```json\n{"score": 1, "reasoning": "Severe failure"}\n```';
    const result = extractJsonFromLLMResponse(input);
    expect(result).toBe('{"score": 1, "reasoning": "Severe failure"}');
  });

  it("handles real-world wrapped evaluation response", () => {
    const input = `## Analysis

The outcome is "CONFIRM" which indicates a successful call.
Score: 9-10 since the call concluded successfully.

\`\`\`json
{
  "detected_phonetic_errors": ["None"],
  "reasoning": "The outcome is CONFIRM. Successful call.",
  "score": 9
}
\`\`\``;
    const result = extractJsonFromLLMResponse(input);
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result!);
    expect(parsed.score).toBe(9);
    expect(parsed.reasoning).toContain("CONFIRM");
  });
});
