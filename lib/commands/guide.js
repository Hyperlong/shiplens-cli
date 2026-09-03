const GUIDE_DATA = {
  core_capability: {
    title: 'Shiplens AI-Powered Analytics & User Telemetry',
    summary: 'Analyze product user behavior, formulate diagnostic questions, query telemetry metrics iteratively to validate hypotheses, and deliver actionable conclusions.',
    prompts_url: 'http://120.26.230.33/demo/dashboard/prompts',
    prompt_library_guide: 'Copy and paste pre-configured data analysis prompts from the dashboard prompt library for specialized growth, retention, or A/B testing diagnostics.',
  },
  project_operations: [
    {
      id: 'projects_list',
      order: 1,
      title: 'List Registered Products',
      description: 'Query all integrated products and associated App IDs registered under your account with full details.',
      required_slots: [],
      clarification_prompt: '',
      default_value: 'Current authenticated account',
      command: 'npx.cmd --yes @shiplens/cli projects list --json',
    },
    {
      id: 'init',
      order: 2,
      title: 'Integrate Local Project with Analytics',
      description: 'Register product under account, install SDK into local project, inject tracking code, and generate UI business context files.',
      required_slots: ['project_path'],
      clarification_prompt: 'Please provide the local project directory path to integrate (or reply "current directory" if working in the active project).',
      default_value: 'Current working directory',
      command: 'npx.cmd --yes @shiplens/cli init --json',
    },
    {
      id: 'projects_update',
      order: 3,
      title: 'Update Product Profile',
      description: 'Modify registered product name, description, and industry category classification.',
      required_slots: ['project_name_or_path'],
      clarification_prompt: 'Please provide the project directory (or product name) and the new information (name, description, or genre) to update.',
      default_value: 'Current project (.shiplens.json)',
      command: 'npx.cmd --yes @shiplens/cli projects update --name "<name>" --description "<desc>" --json',
    },
    {
      id: 'context_update',
      order: 4,
      title: 'Update Local Business Context',
      description: 'Re-scan frontend pages & buttons to refresh local business descriptions.',
      required_slots: ['project_path'],
      clarification_prompt: 'Please confirm the local project directory to update business context files for.',
      default_value: 'Current working directory (.shiplens.json app_id)',
      command: 'npx.cmd --yes @shiplens/cli context generate --json',
    },
    {
      id: 'clean_all',
      order: 5,
      title: 'Remove SDK and Local Context Files',
      description: 'Eject Shiplens SDK from local project directory and delete generated project context files.',
      required_slots: ['project_path', 'confirmation'],
      clarification_prompt: 'Are you sure you want to remove @shiplens/sdk and clean up context files in this project? (yes/no)',
      default_value: 'Requires explicit user confirmation or --force',
      command: 'npx.cmd --yes @shiplens/cli clean all --force --json',
    },
    {
      id: 'project_delete',
      order: 6,
      title: 'Permanently Delete Product and Data',
      description: 'Permanently delete cloud product profile and all historical event statistics (does not delete local code).',
      required_slots: ['project_name_or_app_id', 'confirmation'],
      clarification_prompt: 'Dangerous operation: Deleting cloud product will permanently destroy all historical statistics! Local code will remain untouched. Please enter product name or App ID to confirm:',
      default_value: 'Mandatory human confirmation required (HITL)',
      command: 'npx.cmd --yes @shiplens/cli projects delete --force --json',
    },
  ],
  account_operations: [
    {
      id: 'auth_register',
      order: 1,
      title: 'Register Account via Email',
      description: 'Register a Shiplens account via email Magic Link and activate monthly free quota.',
      required_slots: ['email'],
      clarification_prompt: 'Please provide your email address for registration.',
      default_value: 'None (email required)',
      command: 'npx.cmd --yes @shiplens/cli auth bind --email <email> --json',
    },
    {
      id: 'auth_login_web',
      order: 2,
      title: 'Log In via Web Authorization',
      description: 'Authenticate CLI by opening the web login authorization page in browser.',
      required_slots: [],
      clarification_prompt: '',
      default_value: 'Automatic browser redirect',
      command: 'npx.cmd --yes @shiplens/cli auth login --browser --json',
    },
    {
      id: 'auth_login_env',
      order: 3,
      title: 'Log In via Downloaded .env File',
      description: 'Download shiplens.env from settings page and place it in the project root to authenticate.',
      required_slots: ['shiplens_env_file'],
      clarification_prompt: 'Please visit http://120.26.230.33/settings/api-keys to download your shiplens.env file and place it in your project root directory.',
      default_value: 'Reads ./shiplens.env or ~/.shiplens/config.json',
      command: 'npx.cmd --yes @shiplens/cli auth status --json',
    },
    {
      id: 'auth_logout',
      order: 4,
      title: 'Log Out of CLI',
      description: 'Clear all cached credentials and active sessions from local system.',
      required_slots: [],
      clarification_prompt: '',
      default_value: 'Immediate logout',
      command: 'npx.cmd --yes @shiplens/cli auth logout --json',
    },
    {
      id: 'uninstall_cli',
      order: 5,
      title: 'Uninstall CLI',
      description: 'Remove CLI package and clean up global configurations.',
      required_slots: ['confirmation'],
      clarification_prompt: 'Are you sure you want to uninstall Shiplens CLI and clean up configurations? (yes/no)',
      default_value: 'npm uninstall -g @shiplens/cli',
      command: 'npm.cmd uninstall -g @shiplens/cli',
    },
  ],
  composite_guide: {
    explanation: 'Special or composite operations (e.g. changing App ID, project migration) should be composed dynamically by AI Agents using basic atomic commands.',
    example_change_app_id: [
      '1. Check local authentication status;',
      '2. Run init --force --json to request a new App ID under user account;',
      '3. Update code entry injection and regenerate context dictionary files.',
    ],
  },
};

function formatPlainTextGuide() {
  return `Shiplens CLI - Operations Guide & Capability Catalog

I help you analyze all kinds of user behavior data. Ask any diagnostic question or business inquiry, and I will inspect your product context files, formulate analysis paths, query the data iteratively to validate hypotheses, and deliver clear conclusions.
If you would like more specialized or in-depth data analysis, you can copy textbook prompts from: ${GUIDE_DATA.core_capability.prompts_url}

Available Operations:

Project Operations:
  1. List Registered Products (query all integrated products under your account with full details)
  2. Integrate Local Project with Analytics (register product under account + install SDK + generate context files)
  3. Update Product Profile (modify product name, description, and industry taxonomy)
  4. Update Local Business Context (re-scan frontend pages & buttons to refresh local business descriptions)
  5. Remove SDK and Local Context Files (eject Shiplens SDK from project and clean up generated context files)
  6. Permanently Delete Product and Data (destroy cloud product registration and telemetry statistics, does not affect local code)

Account Operations:
  1. Register Account via Email
  2. Log In via Web Browser
  3. Log In via Downloaded .env File
  4. Log Out of CLI
  5. Fully Uninstall CLI

Note for AI Agents:
  When executing composite requests (such as "change App ID"), compose underlying atomic commands (init --force, context generate, etc.) rather than asking for non-existent special commands.
`;
}

async function handleGuide(args, flags, ctx) {
  ctx.output({
    ok: true,
    ...GUIDE_DATA,
  }, () => {
    console.log(formatPlainTextGuide());
  });
}

module.exports = {
  GUIDE_DATA,
  handleGuide,
  formatPlainTextGuide,
};
