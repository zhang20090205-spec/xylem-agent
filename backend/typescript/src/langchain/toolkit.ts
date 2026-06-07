import { BaseToolkit } from '@langchain/core/tools';
import HederaAgentKitTool from '@/langchain/tool';
import HederaAgentKitAPI from '@/shared/api';
import tools from '@/shared/tools';
import { type Configuration } from '@/shared/configuration';
import { Client } from '@hashgraph/sdk';

class HederaLangchainToolkit implements BaseToolkit {
  private _hederaAgentKit: HederaAgentKitAPI;

  tools: HederaAgentKitTool[];

  constructor({ client, configuration }: { client: Client; configuration: Configuration }) {
    this._hederaAgentKit = new HederaAgentKitAPI(client, configuration.context);

    const context = configuration.context || {};
    const filteredTools =
      // if no tools are provided, use all tools
      !configuration.tools || configuration.tools.length === 0
        ? tools(context)
        : // else use only the tools provided
          tools(context).filter(tool => (configuration.tools ?? []).includes(tool.method));

    this.tools = filteredTools.map(
      tool =>
        new HederaAgentKitTool(
          this._hederaAgentKit,
          tool.method,
          tool.description,
          tool.parameters,
        ),
    );
  }

  getTools(): HederaAgentKitTool[] {
    return this.tools;
  }
}

export default HederaLangchainToolkit;
