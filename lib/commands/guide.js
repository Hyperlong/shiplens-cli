const GUIDE_DATA = {
  core_capability: {
    title: 'Shiplens AI-Powered Analytics & User Telemetry',
    summary: 'Analyze product user behavior, funnel drop-offs, retention cohorts, and page heatmaps. Formulate business questions or copy textbook prompts to receive in-depth diagnostic conclusions.',
    prompts_url: 'http://120.26.230.33/demo/dashboard/prompts',
    prompt_library_guide: 'Copy and paste pre-configured data analysis prompts from the dashboard prompt library for specialized growth, retention, or A/B testing diagnostics.',
  },
  project_operations: [
    {
      id: 'init',
      order: 1,
      title: 'Integrate Local Project with Analytics',
      description: 'Create cloud analytics dashboard, install SDK into local project, inject tracking code, and generate UI business context dictionary.',
      required_slots: ['project_path'],
      clarification_prompt: 'Please provide the local project directory path to integrate (or reply "current directory" if working in the active project).',
      default_value: 'Current working directory',
      command: 'npx.cmd --yes @shiplens/cli init --json',
    },
    {
      id: 'projects_list',
      order: 2,
      title: 'List Cloud Analytics Dashboards',
      description: 'Query all analytics dashboards and associated App IDs registered under your account.',
      required_slots: [],
      clarification_prompt: '',
      default_value: 'Current authenticated account',
      command: 'npx.cmd --yes @shiplens/cli projects list --json',
    },
    {
      id: 'projects_update',
      order: 3,
      title: 'Update Dashboard Information',
      description: 'Modify product name, functional description, and industry category classification.',
      required_slots: ['project_name_or_path'],
      clarification_prompt: 'Please provide the project directory (or name) and the new information (name, description, or genre) to update.',
      default_value: 'Current project (.shiplens.json)',
      command: 'npx.cmd --yes @shiplens/cli projects update --name "<name>" --description "<desc>" --json',
    },
    {
      id: 'context_update',
      order: 4,
      title: 'Update Local Business Context Dictionary',
      description: 'Re-scan local frontend pages, buttons, and user interaction flows to refresh local business context.',
      required_slots: ['project_path'],
      clarification_prompt: 'Please confirm the local project directory to update business context files for.',
      default_value: 'Current working directory (.shiplens.json app_id)',
      command: 'npx.cmd --yes @shiplens/cli context generate --json',
    },
    {
      id: 'project_bind',
      order: 5,
      title: 'Link Local Project to Cloud Dashboard',
      description: 'Connect local project code with your authenticated cloud dashboard to enable telemetry ingestion.',
      required_slots: ['project_name_or_path', 'email'],
      clarification_prompt: 'Please provide the local project directory (or name) and your registered email address.',
      default_value: 'Current project config and logged-in account credentials',
      command: 'npx.cmd --yes @shiplens/cli projects bind --json',
    },
    {
      id: 'clean_sdk',
      order: 6,
      title: 'Remove SDK from Local Project',
      description: 'Uninstall @shiplens/sdk dependency and remove injected tracking code from entry files (eject/revert).',
      required_slots: ['project_path', 'confirmation'],
      clarification_prompt: 'Are you sure you want to remove @shiplens/sdk and revert tracking code in this local project? (yes/no)',
      default_value: 'Requires explicit user confirmation or --force',
      command: 'npx.cmd --yes @shiplens/cli clean sdk --force --json',
    },
    {
      id: 'clean_context',
      order: 7,
      title: 'Delete Local Context Files',
      description: 'Clean up generated .shiplens/contexts/ (.md and .json) dictionary files from local workspace.',
      required_slots: ['project_path', 'confirmation'],
      clarification_prompt: 'Are you sure you want to delete local business context files? (yes/no)',
      default_value: 'Requires explicit user confirmation or --force',
      command: 'npx.cmd --yes @shiplens/cli clean context --force --json',
    },
    {
      id: 'project_delete',
      order: 8,
      title: 'Permanently Destroy Cloud Dashboard',
      description: 'Permanently destroy cloud analytics dashboard and all historical event statistics (does not delete local code).',
      required_slots: ['project_name_or_app_id', 'confirmation'],
      clarification_prompt: 'Dangerous operation: Deleting cloud dashboard will permanently destroy all historical statistics! Local code will remain untouched. Please enter product name or App ID to confirm:',
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

I help you analyze all kinds of user behavior data. Ask any business question or diagnostic inquiry, and I will inspect your product context dictionary, query metrics, and deliver conclusions.
For textbook analysis prompts, visit: ${GUIDE_DATA.core_capability.prompts_url}

Available Operations:

Project Operations:
  1. Integrate Local Project with Analytics (create cloud analytics dashboard + install SDK + generate UI context dictionary)
  2. List Cloud Analytics Dashboards (view all registered analytics dashboards and App IDs)
  3. Update Dashboard Information (modify product name, description, and industry taxonomy)
  4. Update Local Business Context Dictionary (re-scan local frontend pages & buttons to refresh descriptions)
  5. Link Local Project to Cloud Dashboard (connect local project code to cloud analytics dashboard)
  6. Remove SDK from Local Project (eject tracking code and uninstall @shiplens/sdk dependency)
  7. Delete Local Context Files (clean up local generated .md & .json dictionary files)
  8. Permanently Destroy Cloud Dashboard (delete cloud dashboard & all historical event data, does not affect local code)

Account Operations:
  1. Register Account via Email (send passwordless Magic Link activation email)
  2. Log In via Web Browser (open web browser authorization page)
  3. Log In via Downloaded .env File (import shiplens.env device credential)
  4. Log Out of CLI (clear all local credentials and active sessions)
  5. Uninstall CLI (remove CLI tool and clean local configurations)

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
