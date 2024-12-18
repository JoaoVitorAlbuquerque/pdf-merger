import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { PDFDocument } from "pdf-lib";

const app = express('*');
const PORT = 3001;

// Habilitar CORS
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastas para uploads e arquivos mesclados
const UPLOAD_FOLDER = path.join(__dirname, "uploads");
const MERGED_FOLDER = path.join(__dirname, "merged");

// Criar pastas se não existirem
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER);
}
if (!fs.existsSync(MERGED_FOLDER)) {
  fs.mkdirSync(MERGED_FOLDER);
}

// Configuração do Multer para upload de arquivos
const upload = multer({ dest: UPLOAD_FOLDER });

// Endpoint para mesclar PDFs
app.post("/merge-pdfs", upload.array("pdfs"), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // Verificar se todos os arquivos são PDFs
    for (const file of files) {
      if (file.mimetype !== "application/pdf") {
        return res
          .status(400)
          .json({ error: `Arquivo ${file.originalname} não é um PDF válido.` });
      }
    }

    // Criar um novo PDF combinado
    const mergedPdf = await PDFDocument.create();

    // Adicionar cada PDF enviado ao documento combinado
    for (const file of files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(
        pdfDoc,
        pdfDoc.getPageIndices()
      );

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    // Salvar o PDF combinado
    const mergedFilename = `merged-${Date.now()}.pdf`;
    const mergedFilePath = path.join(MERGED_FOLDER, mergedFilename);
    const pdfBytes = await mergedPdf.save();
    fs.writeFileSync(mergedFilePath, pdfBytes);

    // Remover os arquivos temporários enviados
    for (const file of files) {
      fs.unlinkSync(file.path);
    }

    // Retornar o arquivo combinado
    res.download(mergedFilePath, "merged.pdf", (err) => {
      if (err) {
        console.error("Erro ao enviar o arquivo:", err);
      }

      // Remover o arquivo combinado após o download
      fs.unlinkSync(mergedFilePath);
    });
  } catch (error) {
    console.error("Erro ao processar os PDFs:", error);
    res.status(500).json({ error: "Erro ao processar os PDFs." });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
