export interface RoleKeywords {
  core: string[];
  tech: string[];
  adjacent: string[];
}

export const PRESET_ROLES: Record<string, RoleKeywords> = {
  'Full-Stack Developer': {
    core: ['full stack', 'web application', 'api', 'frontend', 'backend', 'database', 'rest', 'mvc', 'architecture', 'responsive'],
    tech: ['javascript', 'typescript', 'react', 'node.js', 'express', 'postgresql', 'mongodb', 'html', 'css', 'git', 'docker', 'next.js'],
    adjacent: ['cloud', 'devops', 'testing', 'ci/cd', 'agile', 'graphql', 'tailwind']
  },
  'Frontend Developer': {
    core: ['frontend', 'user interface', 'ui/ux', 'responsive design', 'web performance', 'accessibility', 'components', 'state management', 'cross-browser'],
    tech: ['javascript', 'typescript', 'react', 'vue', 'angular', 'html5', 'css3', 'tailwind', 'sass', 'redux', 'webpack', 'vite'],
    adjacent: ['design systems', 'figma', 'jest', 'cypress', 'web vitals', 'rest api']
  },
  'Backend Developer': {
    core: ['backend', 'server', 'api', 'microservices', 'database design', 'orm', 'concurrency', 'caching', 'system architecture', 'scalability'],
    tech: ['node.js', 'python', 'java', 'golang', 'postgresql', 'mysql', 'redis', 'kafka', 'docker', 'fastapi', 'spring boot', 'express'],
    adjacent: ['aws', 'kubernetes', 'ci/cd', 'linux', 'graphql', 'grpc', 'security']
  },
  'Cybersecurity Analyst': {
    core: ['security', 'malware', 'threat', 'vulnerability', 'incident response', 'siem', 'penetration', 'forensic', 'network security', 'compliance'],
    tech: ['python', 'wireshark', 'nmap', 'metasploit', 'splunk', 'linux', 'burp suite', 'bash', 'powershell', 'snort'],
    adjacent: ['machine learning', 'networking', 'cloud security', 'cryptography', 'firewalls', 'soc']
  },
  'AI/ML Engineer': {
    core: ['machine learning', 'deep learning', 'model training', 'neural networks', 'nlp', 'computer vision', 'inference', 'feature engineering', 'llm', 'generative ai'],
    tech: ['python', 'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy', 'huggingface', 'langchain', 'cuda', 'onnx', 'docker'],
    adjacent: ['data engineering', 'cloud ml', 'statistics', 'math', 'mlops', 'vector databases']
  },
  'Data Analyst': {
    core: ['data analysis', 'reporting', 'business intelligence', 'dashboards', 'kpi', 'trend analysis', 'data cleaning', 'visualization', 'statistical analysis'],
    tech: ['sql', 'excel', 'python', 'r', 'power bi', 'tableau', 'pandas', 'looker', 'bigquery', 'snowflake'],
    adjacent: ['data warehousing', 'machine learning', 'storytelling', 'a/b testing']
  },
  'Data Scientist': {
    core: ['predictive modeling', 'statistical inference', 'hypothesis testing', 'experimentation', 'algorithms', 'clustering', 'regression', 'data mining'],
    tech: ['python', 'r', 'sql', 'scikit-learn', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'jupyter', 'statsmodels'],
    adjacent: ['deep learning', 'big data', 'spark', 'cloud computing', 'data pipeline']
  },
  'Cloud/DevOps Engineer': {
    core: ['infrastructure as code', 'ci/cd', 'containerization', 'orchestration', 'cloud architecture', 'monitoring', 'automation', 'reliability', 'site reliability'],
    tech: ['aws', 'azure', 'gcp', 'terraform', 'docker', 'kubernetes', 'ansible', 'jenkins', 'github actions', 'prometheus', 'grafana', 'linux', 'bash'],
    adjacent: ['networking', 'security', 'python', 'helm', 'cost optimization']
  },
  'Mobile Developer': {
    core: ['mobile application', 'ios', 'android', 'cross-platform', 'app store', 'offline-first', 'push notifications', 'mobile ui', 'touch gestures'],
    tech: ['react native', 'flutter', 'swift', 'kotlin', 'dart', 'typescript', 'xcode', 'android studio', 'sqlite', 'firebase'],
    adjacent: ['rest api', 'ui/ux', 'app performance', 'ble', 'graphql']
  },
  'QA / Test Engineer': {
    core: ['quality assurance', 'test automation', 'regression testing', 'unit testing', 'end-to-end testing', 'test cases', 'bug tracking', 'performance testing'],
    tech: ['selenium', 'cypress', 'playwright', 'jest', 'pytest', 'postman', 'jmeter', 'javascript', 'python', 'git', 'jira'],
    adjacent: ['ci/cd', 'agile', 'bdd', 'cucumber', 'security testing']
  }
};

