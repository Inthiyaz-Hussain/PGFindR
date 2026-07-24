import dotenv from 'dotenv'
import path from 'path'

// Load .env file using process.cwd() to support both ESM runtime and CommonJS test environment compilation
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
