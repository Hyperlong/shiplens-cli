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
      title: 'Integrate Shiplens Analytics',
      description: 'Create analytics project under account, install SDK, inject tracking code, and generate UI business context dictionary.',
      required_slots: ['project_path'],
      clarification_prompt: 'Please provide the project directory path to integrate (or reply "current directory" if working in the active project).',
      default_value: 'Current working directory',
      command: 'npx.cmd --yes @shiplens/cli init --json',
    },
    {
      id: 'context_update',
      order: 2,
      title: 'Update Business Context Dictionary',
      description: 'Re-scan frontend pages, buttons, and user interaction flows to refresh local business context.',
      required_slots: ['project_path'],
      clarification_prompt: 'Please confirm the project directory to update business context files for.',
      default_value: 'Current working directory (.shiplens.json app_id)',
      command: 'npx.cmd --yes @shiplens/cli context generate --json',
    },
    {
      id: 'project_bind',
      order: 3,
      title: 'Link Project to Account and Start Analytics',
      description: 'Associate current project with your authenticated account to enable telemetry ingestion and reporting.',
      required_slots: ['project_name_or_path', 'email'],
      clarification_prompt: 'Please provide the project directory (or project name) and your registered email address.',
      default_value: 'Current project config and logged-in account credentials',
      command: 'npx.cmd --yes @shiplens/cli projects bind --json',
    },
    {
      id: 'clean_sdk',
      order: 4,
      title: 'Remove SDK and Tracking Code',
      description: 'Uninstall @shiplens/sdk dependency and remove injected tracking code from entry files (eject/revert).',
      required_slots: ['project_path', 'confirmation'],
      clarification_prompt: 'Are you sure you want to remove @shiplens/sdk and revert tracking code in this project? (yes/no)',
      default_value: 'Requires explicit user confirmation or --force',
      command: 'npx.cmd --yes @shiplens/cli clean sdk --force --json',
    },
    {
      id: 'clean_context',
      order: 5,
      title: 'Delete Business Context Files',
      description: 'Clean up generated .shiplens/contexts/ (.md and .json) dictionary files from local workspace.',
      required_slots: ['project_path', 'confirmation'],
      clarification_prompt: 'Are you sure you want to delete local business context files? (yes/no)',
      default_value: 'Requires explicit user confirmation or --force',
      command: 'npx.cmd --yes @shiplens/cli clean context --force --json',
    },
    {
      id: 'project_delete',
      order: 6,
      title: 'Delete Project on Cloud Account',
      description: 'Permanently destroy project and all historical event statistics from cloud servers (irreversible).',
      required_slots: ['project_name_or_app_id', 'confirmation'],
      clarification_prompt: 'Dangerous operation: Deleting cloud project will permanently destroy all historical statistics and dashboards! Please enter project name or App ID to confirm:',
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
  1. Integrate Shiplens Analytics (create cloud project + install SDK + generate UI context dictionary)
  2. Update Business Context Dictionary (re-scan frontend pages & buttons to refresh descriptions)
  3. Link Project to Account & Start Analytics (bind project to currently logged-in account)
  4. Remove SDK Files (eject tracking code and uninstall @shiplens/sdk dependency)
  5. Delete Project Context Files (clean up local generated .md & .json dictionary files)
  6. Delete Cloud Project (permanently destroy project and all historical event statistics)

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
