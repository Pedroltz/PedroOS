/** Previous virtual paths remain valid after the Portuguese desktop rename. */
export const VIRTUAL_PATH_ALIASES: Record<string, string> = {
  projects: 'Projetos', moreprojects: 'MaisProjetos', aboutme: 'SobreMim', documents: 'Documentos',
  experience: 'Experiencia', skills: 'Habilidades', games: 'Jogos', 'readme.txt': 'Leia-me.txt',
  'resume.doc': 'Curriculo.doc', 'career.doc': 'Carreira.doc', 'development.sys': 'Desenvolvimento.sys',
  'artificialintelligence.sys': 'InteligenciaArtificial.sys', 'minesweeper.exe': 'CampoMinado.exe',
  'credits.txt': 'Creditos.txt', 'eastereggs.txt': 'Segredos.txt',
};
export function localizeVirtualPath(path: string): string {
  return path.split('\\').map(segment => VIRTUAL_PATH_ALIASES[segment.toLowerCase()] || segment).join('\\');
}
