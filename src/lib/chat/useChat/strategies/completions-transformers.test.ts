import { describe, it, expect } from "vitest";
import {
  transformMessageContent,
  transformMessage,
  transformMessages,
  transformFunctionSchema,
  transformTool,
  transformTools,
  transformToCompletionsFormat,
  hasMultimodalContent,
} from "./completions-transformers";
import type { LlmapiMessage, LlmapiTool } from "../../../../client";

describe("Chat Completions API Transformers", () => {
  describe("transformMessageContent", () => {
    it("should pass through string content unchanged", () => {
      expect(transformMessageContent("Hello world")).toBe("Hello world");
    });

    it("should return empty string for undefined content", () => {
      expect(transformMessageContent(undefined)).toBe("");
    });

    it("should extract text from array of content parts", () => {
      const content = [
        { type: "text", text: "Hello " },
        { type: "text", text: "world" },
      ];
      expect(transformMessageContent(content)).toBe("Hello world");
    });

    it("should filter out non-text parts", () => {
      const content = [
        { type: "text", text: "Hello" },
        { type: "image_url", image_url: { url: "http://example.com/img.png" } },
        { type: "text", text: " world" },
      ];
      expect(transformMessageContent(content)).toBe("Hello world");
    });

    it("should handle empty array", () => {
      expect(transformMessageContent([])).toBe("");
    });

    it("should handle array with only non-text parts", () => {
      const content = [
        { type: "image_url", image_url: { url: "http://example.com/img.png" } },
      ];
      expect(transformMessageContent(content)).toBe("");
    });
  });

  describe("hasMultimodalContent", () => {
    it("should return false for string content", () => {
      expect(hasMultimodalContent("Hello")).toBe(false);
    });

    it("should return false for undefined content", () => {
      expect(hasMultimodalContent(undefined)).toBe(false);
    });

    it("should return false for text-only content", () => {
      const content = [{ type: "text", text: "Hello" }];
      expect(hasMultimodalContent(content)).toBe(false);
    });

    it("should return true for content with images", () => {
      const content = [
        { type: "text", text: "Hello" },
        { type: "image_url", image_url: { url: "http://example.com/img.png" } },
      ];
      expect(hasMultimodalContent(content)).toBe(true);
    });

    it("should return true for content with input_image", () => {
      const content = [{ type: "input_image", image_url: { url: "data:..." } }];
      expect(hasMultimodalContent(content)).toBe(true);
    });

    it("should return true for content with files", () => {
      const content = [{ type: "input_file", file: { file_id: "123" } }];
      expect(hasMultimodalContent(content)).toBe(true);
    });
  });

  describe("transformMessage", () => {
    it("should transform message with array content to string", () => {
      const message: LlmapiMessage = {
        role: "user",
        content: [{ type: "text", text: "Hello world" }],
      };
      const result = transformMessage(message);
      expect(result.role).toBe("user");
      expect(result.content).toBe("Hello world");
    });

    it("should preserve tool_call_id for tool messages", () => {
      const message: LlmapiMessage = {
        role: "tool",
        content: [{ type: "text", text: "Result" }],
        tool_call_id: "call_123",
      };
      const result = transformMessage(message);
      expect(result.role).toBe("tool");
      expect(result.content).toBe("Result");
      expect(result.tool_call_id).toBe("call_123");
    });

    it("should preserve tool_calls for assistant messages", () => {
      const message: LlmapiMessage = {
        role: "assistant",
        content: [{ type: "text", text: "" }],
        tool_calls: [
          {
            id: "call_123",
            type: "function",
            function: { name: "test_func", arguments: "{}" },
          },
        ],
      };
      const result = transformMessage(message);
      expect(result.tool_calls).toEqual(message.tool_calls);
    });

    it("should keep array format for multimodal content", () => {
      const message: LlmapiMessage = {
        role: "user",
        content: [
          { type: "text", text: "What's in this image?" },
          { type: "image_url", image_url: { url: "http://example.com/img.png" } },
        ],
      };
      const result = transformMessage(message);
      expect(result.content).toEqual(message.content);
    });
  });

  describe("transformMessages", () => {
    it("should transform all messages in array", () => {
      const messages: LlmapiMessage[] = [
        { role: "system", content: [{ type: "text", text: "You are helpful" }] },
        { role: "user", content: [{ type: "text", text: "Hello" }] },
      ];
      const result = transformMessages(messages);
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("You are helpful");
      expect(result[1].content).toBe("Hello");
    });
  });

  describe("transformFunctionSchema", () => {
    it("should rename 'arguments' to 'parameters'", () => {
      const fn = {
        name: "my_func",
        description: "A test function",
        arguments: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
        },
      };
      const result = transformFunctionSchema(fn);
      expect(result.name).toBe("my_func");
      expect(result.description).toBe("A test function");
      expect(result.parameters).toEqual(fn.arguments);
      expect(result.arguments).toBeUndefined();
    });

    it("should pass through function with parameters unchanged", () => {
      const fn = {
        name: "my_func",
        parameters: {
          type: "object",
          properties: {},
        },
      };
      const result = transformFunctionSchema(fn);
      expect(result).toEqual(fn);
    });
  });

  describe("transformTool", () => {
    it("should expand web_search shorthand to full function definition", () => {
      const tool: LlmapiTool = { type: "web_search" };
      const result = transformTool(tool);
      expect(result.type).toBe("function");
      expect(result.function).toBeDefined();
      expect((result.function as any).name).toBe("web_search");
      expect((result.function as any).description).toBe(
        "Search the web for real-time information."
      );
      expect((result.function as any).parameters).toBeDefined();
    });

    it("should expand code_interpreter shorthand", () => {
      const tool: LlmapiTool = { type: "code_interpreter" };
      const result = transformTool(tool);
      expect(result.type).toBe("function");
      expect((result.function as any).name).toBe("code_interpreter");
    });

    it("should expand file_search shorthand", () => {
      const tool: LlmapiTool = { type: "file_search" };
      const result = transformTool(tool);
      expect(result.type).toBe("function");
      expect((result.function as any).name).toBe("file_search");
    });

    it("should transform function tool with arguments to parameters", () => {
      const tool: LlmapiTool = {
        type: "function",
        function: {
          name: "my_func",
          arguments: {
            type: "object",
            properties: { query: { type: "string" } },
          },
        },
      };
      const result = transformTool(tool);
      expect(result.type).toBe("function");
      expect((result.function as any).parameters).toEqual(
        tool.function?.arguments
      );
      expect((result.function as any).arguments).toBeUndefined();
    });

    it("should pass through unknown tool types unchanged", () => {
      const tool = { type: "unknown_tool", custom_field: "value" };
      const result = transformTool(tool as any);
      expect(result).toEqual(tool);
    });
  });

  describe("transformTools", () => {
    it("should transform all tools in array", () => {
      const tools: LlmapiTool[] = [
        { type: "web_search" },
        {
          type: "function",
          function: {
            name: "custom_func",
            arguments: { type: "object", properties: {} },
          },
        },
      ];
      const result = transformTools(tools);
      expect(result).toHaveLength(2);
      expect((result![0].function as any).name).toBe("web_search");
      expect((result![1].function as any).name).toBe("custom_func");
      expect((result![1].function as any).parameters).toBeDefined();
    });

    it("should return undefined for undefined input", () => {
      expect(transformTools(undefined)).toBeUndefined();
    });

    it("should return undefined for empty array", () => {
      expect(transformTools([])).toBeUndefined();
    });
  });

  describe("transformToCompletionsFormat", () => {
    it("should transform complete request body", () => {
      const params = {
        messages: [
          {
            role: "user" as const,
            content: [{ type: "text", text: "Hello" }],
          },
        ],
        model: "gpt-4",
        stream: true,
        temperature: 0.7,
        maxOutputTokens: 1000,
        tools: [
          { type: "web_search" },
          {
            type: "function",
            function: {
              name: "my_func",
              arguments: { type: "object", properties: {} },
            },
          },
        ] as LlmapiTool[],
        toolChoice: "auto",
      };

      const result = transformToCompletionsFormat(params);

      // Check messages are transformed
      expect((result.messages as any)[0].content).toBe("Hello");

      // Check model and stream are passed through
      expect(result.model).toBe("gpt-4");
      expect(result.stream).toBe(true);

      // Check optional params are included
      expect(result.temperature).toBe(0.7);
      expect(result.max_tokens).toBe(1000);
      expect(result.tool_choice).toBe("auto");

      // Check tools are transformed
      const tools = result.tools as any[];
      expect(tools).toHaveLength(2);
      expect(tools[0].function.name).toBe("web_search");
      expect(tools[1].function.parameters).toBeDefined();
    });

    it("should omit undefined optional params", () => {
      const params = {
        messages: [{ role: "user" as const, content: [{ type: "text", text: "Hi" }] }],
        model: "gpt-4",
        stream: true,
      };

      const result = transformToCompletionsFormat(params);

      expect(result.temperature).toBeUndefined();
      expect(result.max_tokens).toBeUndefined();
      expect(result.tools).toBeUndefined();
      expect(result.tool_choice).toBeUndefined();
    });
  });
});
