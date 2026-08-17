(() => {
  "use strict";

  const Registry = globalThis.GestaoTutoresAdapters;
  const Base = globalThis.GestaoTutoresMoodleBase;

  const adapter = Base.createAdapter({
    id: "moodle-goias-v1",
    environmentName: "Moodle Goiás",
    sourcePaths: ["/my/", "/course/index.php"],
    participantTableSelectors: [
      "table#participants",
      "table.generaltable",
      "[data-region='participants'] table",
      "table"
    ],
    profileLinkSelectors: [
      'a[href*="/user/view.php"]',
      'a[href*="/user/profile.php"]'
    ],
    roleAliases: [
      "papel", "papeis", "papéis", "função", "funcao", "funções", "funcoes", "role", "roles"
    ],
    roleFallbackSelectors: [
      "[data-region*='role']",
      ".roles",
      ".role"
    ],
    shortnameSelectors: [
      "[data-course-shortname]",
      ".course-shortname",
      "[data-region='course-summary'] [data-shortname]"
    ]
  });

  Registry.register("ead.fieg.com.br", adapter);
})();
