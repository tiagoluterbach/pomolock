// ==========================================
// Data Science roadmap
// Item ids are stored in the user's progress, so never rename an existing id;
// change the label instead. New items can be added anywhere.
// ==========================================

export interface RoadmapItem {
    id: string
    label: string
    project?: boolean // closing project of a section
}

export interface RoadmapGroup {
    title?: string // subsection title (e.g. Pandas); omitted for the area's core topics
    items: RoadmapItem[]
}

export interface RoadmapArea {
    id: string
    title: string
    groups: RoadmapGroup[]
}

export const ROADMAP: RoadmapArea[] = [
    {
        id: 'python',
        title: 'Python',
        groups: [
            {
                items: [
                    { id: 'python-syntax', label: 'Sintaxe e tipos' },
                    { id: 'python-control-flow', label: 'Controle de fluxo' },
                    { id: 'python-functions', label: 'Funções' },
                    { id: 'python-data-structures', label: 'Listas, dicts, sets e tuplas' },
                    { id: 'python-comprehensions', label: 'Compreensões' },
                    { id: 'python-exceptions', label: 'Exceções' },
                    { id: 'python-files', label: 'Leitura e escrita de arquivos' },
                    { id: 'python-modules', label: 'Módulos, pip e ambientes virtuais' },
                    { id: 'python-oop', label: 'POO básica' },
                ],
            },
            {
                title: 'NumPy',
                items: [
                    { id: 'numpy-arrays', label: 'Arrays e indexação' },
                    { id: 'numpy-broadcasting', label: 'Broadcasting e vetorização' },
                ],
            },
            {
                title: 'Pandas',
                items: [
                    { id: 'pandas-io', label: 'Leitura de dados (CSV, Excel, SQL)' },
                    { id: 'pandas-selection', label: 'Seleção e filtros' },
                    { id: 'pandas-cleaning', label: 'Limpeza: nulos, tipos e duplicatas' },
                    { id: 'pandas-groupby', label: 'groupby e agregações' },
                    { id: 'pandas-merge', label: 'merge e join' },
                    { id: 'pandas-reshape', label: 'pivot e melt' },
                    { id: 'pandas-dates', label: 'Datas e tempo' },
                ],
            },
            {
                title: 'Visualização',
                items: [
                    { id: 'viz-matplotlib', label: 'Matplotlib' },
                    { id: 'viz-seaborn', label: 'Seaborn' },
                ],
            },
            {
                items: [
                    { id: 'python-project', label: 'Análise exploratória de um dataset real', project: true },
                ],
            },
        ],
    },
    {
        id: 'tools',
        title: 'Ferramentas',
        groups: [
            {
                items: [
                    { id: 'tools-terminal', label: 'Terminal' },
                    { id: 'tools-git', label: 'Git e GitHub' },
                    { id: 'tools-notebooks', label: 'Jupyter e VS Code' },
                ],
            },
        ],
    },
    {
        id: 'sql',
        title: 'SQL',
        groups: [
            {
                items: [
                    { id: 'sql-select', label: 'SELECT, WHERE e ORDER BY' },
                    { id: 'sql-aggregation', label: 'GROUP BY e HAVING' },
                    { id: 'sql-joins', label: 'JOINs' },
                    { id: 'sql-subqueries', label: 'Subqueries' },
                    { id: 'sql-ctes', label: 'CTEs' },
                    { id: 'sql-window', label: 'Window functions' },
                    { id: 'sql-project', label: 'Responder perguntas de negócio em um banco real', project: true },
                ],
            },
        ],
    },
    {
        id: 'math',
        title: 'Matemática',
        groups: [
            {
                title: 'Álgebra linear',
                items: [
                    { id: 'math-vectors', label: 'Vetores e matrizes' },
                    { id: 'math-matrix-ops', label: 'Produto, transposta e inversa' },
                    { id: 'math-eigen', label: 'Autovalores e autovetores (intuição)' },
                ],
            },
            {
                title: 'Cálculo',
                items: [
                    { id: 'math-derivatives', label: 'Derivadas' },
                    { id: 'math-gradient', label: 'Gradiente e regra da cadeia' },
                ],
            },
        ],
    },
    {
        id: 'stats',
        title: 'Estatística',
        groups: [
            {
                items: [
                    { id: 'stats-descriptive', label: 'Estatística descritiva' },
                    { id: 'stats-probability', label: 'Probabilidade' },
                    { id: 'stats-distributions', label: 'Distribuições' },
                    { id: 'stats-sampling', label: 'Amostragem e Teorema Central do Limite' },
                    { id: 'stats-confidence', label: 'Intervalos de confiança' },
                    { id: 'stats-hypothesis', label: 'Testes de hipótese' },
                    { id: 'stats-ab', label: 'Teste A/B' },
                    { id: 'stats-regression', label: 'Correlação e regressão' },
                    { id: 'stats-project', label: 'Análise de um teste A/B', project: true },
                ],
            },
        ],
    },
    {
        id: 'ml',
        title: 'Machine Learning',
        groups: [
            {
                title: 'Base',
                items: [
                    { id: 'ml-workflow', label: 'Workflow: treino/teste e vazamento de dados' },
                    { id: 'ml-sklearn', label: 'scikit-learn e pipelines' },
                ],
            },
            {
                title: 'Modelos',
                items: [
                    { id: 'ml-linear', label: 'Regressão linear e logística' },
                    { id: 'ml-trees', label: 'Árvores de decisão' },
                    { id: 'ml-ensembles', label: 'Random forest e gradient boosting' },
                ],
            },
            {
                title: 'Avaliação e ajuste',
                items: [
                    { id: 'ml-metrics', label: 'Métricas' },
                    { id: 'ml-cv', label: 'Validação cruzada' },
                    { id: 'ml-features', label: 'Feature engineering' },
                    { id: 'ml-tuning', label: 'Tuning de hiperparâmetros' },
                ],
            },
            {
                title: 'Não supervisionado',
                items: [
                    { id: 'ml-kmeans', label: 'k-means' },
                    { id: 'ml-pca', label: 'PCA' },
                ],
            },
            {
                items: [
                    { id: 'ml-project', label: 'Modelo do início ao fim', project: true },
                ],
            },
        ],
    },
    {
        id: 'communication',
        title: 'Comunicação',
        groups: [
            {
                items: [
                    { id: 'comm-eda', label: 'EDA bem documentada' },
                    { id: 'comm-storytelling', label: 'Storytelling com dados' },
                    { id: 'comm-dashboards', label: 'Streamlit ou Power BI' },
                    { id: 'comm-project', label: 'Dashboard publicado', project: true },
                ],
            },
        ],
    },
    {
        id: 'next',
        title: 'Depois',
        groups: [
            {
                items: [
                    { id: 'next-time-series', label: 'Séries temporais e finanças' },
                    { id: 'next-deep-learning', label: 'Deep learning básico' },
                    { id: 'next-deploy', label: 'Deploy de modelos' },
                ],
            },
        ],
    },
]

export function getAreaItems(area: RoadmapArea): RoadmapItem[] {
    return area.groups.flatMap((group) => group.items)
}
