# BILIN Method Icons & Visual Assets Reference

This document provides a structured reference for all BILIN Method icons and visual assets used in the EduSchedule application.

---

## BILIN Pillars (7 Pillars)

The BILIN Method is built on 7 pedagogical pillars, each with its own icon and brand color.

| Pillar Key | Label (PT) | Description | Icon Path | Brand Color |
|------------|------------|-------------|-----------|-------------|
| `ACONCHEGO_EDUCATIVO` | Aconchego Educativo | Conforto e segurança no ambiente de aprendizagem | `/icons/bilin/aconchego-educativo.png` | `#8B946A` (Olive) |
| `CONEXAO_LUDICA` | Conexão Lúdica | Aprendizagem através do brincar e da conexão | `/icons/bilin/conexao-ludica.png` | `#F7C699` (Peach) |
| `CRESCIMENTO_NATURAL` | Crescimento Natural | Desenvolvimento orgânico e respeitoso do ritmo | `/icons/bilin/crescimento-natural.png` | `#FFB8B8` (Pink) |
| `CURIOSIDADE_ATENTA` | Curiosidade Atenta | Despertar e nutrir a curiosidade natural | `/icons/bilin/curiosidade-atenta.png` | `#FEE496` (Yellow) |
| `EXPRESSAO_VIVA` | Expressão Viva | Comunicação e expressão criativa | `/icons/bilin/expressao-viva.png` | `#9DDCF9` (Sky Blue) |
| `JORNADA_UNICA` | Jornada Única | Respeito à jornada individual de cada aluno | `/icons/bilin/jornada-unica.png` | `#9796CA` (Lavender) |
| `PROCESSO_CONTINUO` | Processo Contínuo | Evolução constante e progressiva | `/icons/bilin/processo-continuo.png` | `#CC7940` (Orange/Rust) |

### Icon Files Location

```
public/icons/bilin/
├── aconchego-educativo.png   (8.8 KB)
├── conexao-ludica.png        (9.4 KB)
├── crescimento-natural.png   (12.4 KB)
├── curiosidade-atenta.png    (12.1 KB)
├── expressao-viva.png        (11.9 KB)
├── jornada-unica.png         (11.6 KB)
└── processo-continuo.png     (6.4 KB)
```

### Usage in Code

Import from constants:
```typescript
import { BILIN_PILLARS, BILIN_PILLAR_KEYS } from '@/constants/bilin';

// Access a specific pillar
const pillar = BILIN_PILLARS.ACONCHEGO_EDUCATIVO;
console.log(pillar.icon);  // '/icons/bilin/aconchego-educativo.png'
console.log(pillar.color); // '#8B946A'
console.log(pillar.label); // 'Aconchego Educativo'
```

Component usage:
```astro
import PillarSelector from '@/components/PillarSelector.astro';

<PillarSelector name="bilin_pillars" required minSelection={1} maxSelection={3} />
```

---

## Skill Dimensions (6 Skills)

Student progress is tracked across 6 skill dimensions using emoji icons.

| Skill Key | Label (PT) | Icon |
|-----------|------------|------|
| `criatividade` | Criatividade | 💡 |
| `leitura` | Leitura | 📖 |
| `escrita` | Escrita | ✍️ |
| `escuta` | Escuta | 👂 |
| `atencao` | Atenção | 🎯 |
| `espontaneidade` | Espontaneidade | 🌟 |

### Rating Scale (0-5)

| Value | Label (PT) | Short Label | CSS Color Variable |
|-------|------------|-------------|-------------------|
| 0 | Não avaliado | - | `var(--color-text-muted)` |
| 1 | Iniciando | 1 | `var(--color-danger)` |
| 2 | Em desenvolvimento | 2 | `var(--color-warning)` |
| 3 | Progredindo | 3 | `var(--color-info)` |
| 4 | Bom desempenho | 4 | `var(--color-success)` |
| 5 | Excelente | 5 | `var(--color-primary)` |

### Usage in Code

```typescript
import { SKILL_DIMENSIONS, SKILL_RATING_SCALE } from '@/constants/bilin';

// Access skill info
const skill = SKILL_DIMENSIONS.criatividade;
console.log(skill.icon);  // '💡'
console.log(skill.label); // 'Criatividade'

// Access rating info
const rating = SKILL_RATING_SCALE[4];
console.log(rating.label); // 'Bom desempenho'
```

Component usage:
```astro
import SkillRatingInput from '@/components/SkillRatingInput.astro';

<SkillRatingInput name="skill_ratings" studentName="Maria" />
```

---

## Brand Colors

These are the official BILIN brand colors used throughout the application.

| Color Name | Hex Value | Usage |
|------------|-----------|-------|
| Coral | `#F69897` | Primary/accent color |
| Cream | `#FDF5E6` | Background |
| Tan | `#F5E6D3` | Surface |
| Dark | `#2F2F2F` | Text |
| Yellow | `#FEE496` | Curiosidade Atenta pillar |
| Light Pink | `#FFB8B8` | Crescimento Natural pillar |
| Rust/Orange | `#CC7940` | Processo Contínuo pillar |
| Olive | `#8B946A` | Aconchego Educativo pillar |
| Peach | `#F7C699` | Conexão Lúdica pillar |
| Sky Blue | `#9DDCF9` | Expressão Viva pillar |
| Lavender | `#9796CA` | Jornada Única pillar |

---

## Source Files

- **Constants**: `src/constants/bilin.ts`
- **Types**: `src/lib/repositories/types.ts` (BilinPillar, SkillDimension, SkillRatings)
- **Components**:
  - `src/components/PillarSelector.astro` - Multi-select pillar picker
  - `src/components/SkillRatingInput.astro` - 5-dot skill rating input

---

## Database Storage

Pillar selections and skill ratings are stored in the `completions` table:

```sql
-- bilin_pillars: JSON array of selected pillar keys
-- Example: '["ACONCHEGO_EDUCATIVO","EXPRESSAO_VIVA"]'

-- skill_ratings: JSON object with dimension ratings
-- Example: '{"criatividade":4,"leitura":3,"escrita":0,"escuta":5,"atencao":4,"espontaneidade":3}'
```

---

*Last Updated: 2025-12-26*
