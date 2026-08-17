(() => {
  "use strict";

  const Registry = globalThis.GestaoTutoresAdapters;
  const Base = globalThis.GestaoTutoresMoodleBase;

  const adapter = Base.createAdapter({
    id: "moodle-ctm-go-v2",
    environmentName: "Moodle CTM GO",
    includeCurrentDocumentInDiscovery: false,
    sourcePaths: ["/course/management.php?categoryid=11"],
    scope: {
      type: "category-tree",
      categoryId: "11",
      label: "CTM/DR-GO",
      url: "/course/management.php?categoryid=11"
    },
    courseLinkSelector: [
      '#course-category-listings a[href*="/course/view.php"]',
      '[data-region="course-listing"] a[href*="/course/view.php"]',
      '.course-listing a[href*="/course/view.php"]'
    ].join(","),
    categoryLinkSelector: [
      '#course-category-listings a[href*="categoryid="]',
      '[data-region="category-listing"] a[href*="categoryid="]',
      '.category-listing a[href*="categoryid="]',
      '.course_category_tree a[href*="categoryid="]'
    ].join(","),
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
