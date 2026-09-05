"""Learning-resource links per skill.

Rather than hardcode a specific course URL per skill — something nobody
can verify stays live, correct, or even exists for all 250+ skills in
skills_taxonomy.py — this generates two kinds of links:

1. A small, hand-picked set of canonical homepages for the ~50 most common
   "flagship" skills (official docs / project sites): stable URLs that are
   safe to vouch for directly.
2. For every other skill, live search-results links on major, well-known
   learning platforms. These are never a specific fabricated course —
   just the platform's real search page with the skill name as the query
   — so every one of the 250+ taxonomy skills resolves to something real
   and clickable, not a guess.
"""

from typing import Dict, List
from urllib.parse import quote_plus

# Hand-picked canonical homepage per flagship skill. Kept intentionally
# small — only skills common enough that a single, stable, official-docs
# URL is well known and safe to hardcode.
CANONICAL_HOMEPAGES: Dict[str, str] = {
    "Python": "https://docs.python.org/3/tutorial/",
    "JavaScript": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    "TypeScript": "https://www.typescriptlang.org/docs/",
    "Java": "https://docs.oracle.com/en/java/",
    "Go": "https://go.dev/learn/",
    "Rust": "https://www.rust-lang.org/learn",
    "C++": "https://isocpp.org/get-started",
    "C#": "https://learn.microsoft.com/en-us/dotnet/csharp/",
    "SQL": "https://www.postgresql.org/docs/current/tutorial.html",
    "React": "https://react.dev/learn",
    "Angular": "https://angular.dev/tutorials",
    "Vue": "https://vuejs.org/guide/introduction.html",
    "Next.js": "https://nextjs.org/learn",
    "Node.js": "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
    "Django": "https://docs.djangoproject.com/en/stable/intro/tutorial01/",
    "Flask": "https://flask.palletsprojects.com/en/latest/quickstart/",
    "FastAPI": "https://fastapi.tiangolo.com/tutorial/",
    "Docker": "https://docs.docker.com/get-started/",
    "Kubernetes": "https://kubernetes.io/docs/tutorials/",
    "AWS": "https://aws.amazon.com/getting-started/",
    "Azure": "https://learn.microsoft.com/en-us/training/azure/",
    "GCP": "https://cloud.google.com/docs",
    "Terraform": "https://developer.hashicorp.com/terraform/tutorials",
    "Git": "https://git-scm.com/doc",
    "Linux": "https://linuxjourney.com/",
    "GraphQL": "https://graphql.org/learn/",
    "PostgreSQL": "https://www.postgresql.org/docs/current/tutorial.html",
    "MySQL": "https://dev.mysql.com/doc/",
    "MongoDB": "https://www.mongodb.com/docs/manual/tutorial/getting-started/",
    "Redis": "https://redis.io/docs/latest/",
    "Pandas": "https://pandas.pydata.org/docs/getting_started/index.html",
    "NumPy": "https://numpy.org/doc/stable/user/quickstart.html",
    "scikit-learn": "https://scikit-learn.org/stable/tutorial/index.html",
    "TensorFlow": "https://www.tensorflow.org/tutorials",
    "PyTorch": "https://pytorch.org/tutorials/",
    "Machine Learning": "https://developers.google.com/machine-learning/crash-course",
    "Swift": "https://www.swift.org/getting-started/",
    "SwiftUI": "https://developer.apple.com/tutorials/swiftui",
    "Kotlin": "https://kotlinlang.org/docs/getting-started.html",
    "Flutter": "https://docs.flutter.dev/get-started/install",
    "React Native": "https://reactnative.dev/docs/getting-started",
    "Android SDK": "https://developer.android.com/get-started",
    "Figma": "https://help.figma.com/hc/en-us/categories/360002051613-Getting-started",
    "Selenium": "https://www.selenium.dev/documentation/",
    "Cypress": "https://docs.cypress.io/app/get-started/why-cypress",
    "Jenkins": "https://www.jenkins.io/doc/",
    "Ansible": "https://docs.ansible.com/ansible/latest/getting_started/index.html",
    "Tailwind CSS": "https://tailwindcss.com/docs/installation",
    "Agile": "https://www.atlassian.com/agile",
    "Scrum": "https://www.scrum.org/resources/what-is-scrum",
    "REST API": "https://restfulapi.net/",
    "HTML": "https://developer.mozilla.org/en-US/docs/Web/HTML",
    "CSS": "https://developer.mozilla.org/en-US/docs/Web/CSS",
    "Excel": "https://support.microsoft.com/en-us/excel",
    "Tableau": "https://www.tableau.com/learn/training",
    "Power BI": "https://learn.microsoft.com/en-us/power-bi/",
}


def _search_links(skill_name: str) -> List[Dict[str, str]]:
    """Live search-results pages on major learning platforms — always a
    valid, real page, never a specific course we can't verify."""
    query = quote_plus(skill_name)
    return [
        {"platform": "Coursera", "type": "search", "url": f"https://www.coursera.org/search?query={query}"},
        {"platform": "Udemy", "type": "search", "url": f"https://www.udemy.com/courses/search/?q={query}"},
        {"platform": "YouTube", "type": "search", "url": f"https://www.youtube.com/results?search_query={quote_plus(skill_name + ' tutorial')}"},
    ]


def resources_for_skill(skill_name: str) -> List[Dict[str, str]]:
    """Learning resources for one skill: a hand-verified canonical homepage
    when we have one, plus search links on major platforms — so every one
    of the 250+ taxonomy skills (and anything else typed in) resolves to
    something real and clickable."""
    resources: List[Dict[str, str]] = []
    homepage = CANONICAL_HOMEPAGES.get(skill_name)
    if homepage:
        resources.append({"platform": "Official docs", "type": "homepage", "url": homepage})
    resources.extend(_search_links(skill_name))
    return resources
