import fs from "fs"
import path from "path"

const content = fs.readFileSync("src/lib/data/products.ts", "utf-8")
const blocks = []
const pRegex = /p\(\{/g
let match
while ((match = pRegex.exec(content)) !== null) {
  const start = match.index + 3
  let depth = 1
  let i = start
  while (i < content.length && depth > 0) {
    if (content[i] === "{") depth++
    else if (content[i] === "}") depth--
    i++
  }
  const block = content.substring(match.index, i)
  blocks.push(block)
}

const products = []
for (const block of blocks) {
  const slugMatch = block.match(/slug:\s*["'\''`]([^"'\''`]+)["'\''`]/)
  if (!slugMatch) continue
  const folderMatch = block.match(/imageFolder:\s*["'\''`]([^"'\''`]+)["'\''`]/)
  const imageMatch = block.match(/image:\s*["'\''`]([^"'\''`]+)["'\''`]/)
  products.push({
    slug: slugMatch[1],
    folder: folderMatch ? folderMatch[1] : "",
    explicitImage: imageMatch ? imageMatch[1] : null,
  })
}

const baseDir = "public/images/products"
const actualFiles = {}
try {
  const dirs = fs.readdirSync(baseDir, { withFileTypes: true }).filter(d => d.isDirectory())
  for (const dir of dirs) {
    const files = fs.readdirSync(path.join(baseDir, dir.name))
    actualFiles[dir.name] = files
  }
} catch(e) {}

console.log("=== AUDIT RESULTS ===")
for (const p of products) {
  const fallback = `/images/products/${p.folder}/1.webp`
  const declared = p.explicitImage || fallback
  const declaredFile = declared.split("/").pop()
  const actual = actualFiles[p.folder] || []
  const exists = actual.some(f => f === declaredFile)
  const baseName = declaredFile.includes(".") ? declaredFile.substring(0, declaredFile.lastIndexOf(".")) : declaredFile
  const variantFound = actual.some(f => f.startsWith(baseName + "."))
  const mismatch = !exists && !variantFound
  const status = mismatch ? "MISMATCH" : "OK"
  console.log(`${status}|${p.slug}|${declared}|${actual.join(",")}`)
}

console.log("\n=== EXPLICIT image OVERRIDES ===")
for (const p of products) {
  if (p.explicitImage) console.log(`${p.slug}|${p.explicitImage}`)
}