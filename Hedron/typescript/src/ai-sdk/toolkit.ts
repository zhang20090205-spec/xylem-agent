import HederaAgentAPI from '../shared/api';
import tools from '../shared/tools';
import { type Configuration } from '../shared/configuration';
import type { Tool, LanguageModelV1Middleware } from 'ai';
import { Client } from '@hashgraph/sdk';
import HederaAgentKitTool from './tool';

class HederaAIToolkit {
  private _hedera: HederaAgentAPI;

  tools: { [key: string]: Tool };

  constructor({ client, configuration }: { client: Client; configuration: Configuration }) {
    this._hedera = new HederaAgentAPI(client, configuration.context);
    this.tools = {};

    const context = configuration.context || {};
    const filteredTools =
      // if no tools are provided, use all tools
      !configuration.tools || configuration.tools.length === 0
        ? tools(context)
        : // else use only the tools provided
          tools(context).filter(tool => (configuration.tools ?? []).includes(tool.method));

    filteredTools.forEach(tool => {
      this.tools[tool.method] = HederaAgentKitTool(
        this._hedera,
        tool.method,
        tool.description,
        tool.parameters,
      );
    });
  }

  middleware(): LanguageModelV1Middleware {
    return {
      wrapGenerate: async ({ doGenerate }) => {
        return doGenerate();
      },
      wrapStream: async ({ doStream }) => {
        // Pre-processing can be added here if needed
        return doStream();
      },
    };
  }
  getTools(): { [key: string]: Tool } {
    return this.tools;
  }
}

export default HederaAIToolkit;
