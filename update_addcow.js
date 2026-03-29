import fs from 'fs';

const p = 'frontend/src/pages/AddCow.jsx';
let content = fs.readFileSync(p, 'utf-8');

// 1. Add settingsAPI import
if (!content.includes('settingsAPI')) {
  content = content.replace(
    /import \{ cowsAPI \} from '\.\.\/services\/cowsAPI';/,
    "import { cowsAPI } from '../services/cowsAPI';\nimport { settingsAPI } from '../services/api';"
  );
}

// 2. Add cowFormSettings state
if (!content.includes('cowFormSettings')) {
  content = content.replace(
    /const \[createdCowId, setCreatedCowId\] = useState\(null\);/,
    "const [createdCowId, setCreatedCowId] = useState(null);\n  const [cowFormSettings, setCowFormSettings] = useState({ breeds: ['HF', 'Jersey', 'Gir', 'Other'], cow_types: ['normal', 'milking', 'pregnant', 'dry', 'calf', 'Other'] });"
  );
}

fs.writeFileSync(p, content, 'utf-8');
console.log('Successfully injected lines');
