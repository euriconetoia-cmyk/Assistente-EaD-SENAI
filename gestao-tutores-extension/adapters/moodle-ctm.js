(() => {
  "use strict";

  const Registry = globalThis.GestaoTutoresAdapters;
  const Base = globalThis.GestaoTutoresMoodleBase;

  const adapter = Base.createAdapter({
    id: "moodle-ctm-go-v1",
    environmentName: "Moodle CTM GO",
    sourcePaths: ["/my/", "/course/index.php"],
    participantTableSelectors: [
      "table#participants",
      "[data-region='participants'] table",
      "table.generaltable",
      "table"
    ],
    profileLinkSelectors: [
      'a[href*="/user/view.php"]',
      'a[href*="/user/profile.php"]'
    ],
    roleAliases: [
      "papel", "papeis", "papéis", "role", "roles", "função", "funcao", "funções", "funcoes"
    ],
    roleFallbackSelectors: [
      "[data-region*='role']",
      ".roles",
      ".role"
    ],
    shortnameSelectors: [
      "[data-course-shortname]",
      ".course-shortname"
    ]
  });

  Registry.register("ead.senai.br", adapter);
})();
