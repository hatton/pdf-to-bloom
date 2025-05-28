import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Download, Settings, FileText, Loader2 } from "lucide-react";

interface ConversionState {
  status: "idle" | "converting" | "success" | "error";
  result?: string;
  error?: string;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [mistralKey, setMistralKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [skipEnrichment, setSkipEnrichment] = useState(false);
  const [conversionState, setConversionState] = useState<ConversionState>({
    status: "idle",
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  const handleConvert = async () => {
    if (!file || !mistralKey) return;

    setConversionState({ status: "converting" });

    try {
      // Note: In a real implementation, this would need to handle file upload
      // and processing on a backend service since the core library uses Node.js APIs
      // that aren't available in the browser

      // This is a placeholder for the actual implementation
      setTimeout(() => {
        setConversionState({
          status: "success",
          result:
            "<html><body><h1>Sample Bloom HTML Output</h1><p>This would contain the converted content.</p></body></html>",
        });
      }, 3000);
    } catch (error) {
      setConversionState({
        status: "error",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const downloadResult = () => {
    if (conversionState.result) {
      const blob = new Blob([conversionState.result], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bloom-output.html";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PDF to Bloom Converter
          </h1>
          <p className="text-lg text-gray-600">
            Convert PDF documents to Bloom-compatible HTML format
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            Configuration
          </h2>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mistral AI API Key *
              </label>
              <input
                type="password"
                value={mistralKey}
                onChange={(e) => setMistralKey(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Mistral AI API key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenRouter API Key (optional)
              </label>
              <input
                type="password"
                value={openrouterKey}
                onChange={(e) => setOpenrouterKey(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter OpenRouter API key for enrichment"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="skipEnrichment"
              checked={skipEnrichment}
              onChange={(e) => setSkipEnrichment(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="skipEnrichment" className="text-sm text-gray-700">
              Skip markdown enrichment step
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2" size={20} />
            Upload PDF
          </h2>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            {file ? (
              <div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  {isDragActive
                    ? "Drop the PDF here"
                    : "Drag & drop a PDF file here"}
                </p>
                <p className="text-sm text-gray-500">
                  or click to select a file
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={handleConvert}
            disabled={
              !file || !mistralKey || conversionState.status === "converting"
            }
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center mx-auto"
          >
            {conversionState.status === "converting" ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={20} />
                Converting...
              </>
            ) : (
              <>
                <FileText className="mr-2" size={20} />
                Convert to Bloom
              </>
            )}
          </button>
        </div>

        {conversionState.status === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Conversion Successful!
            </h3>
            <p className="text-green-700 mb-4">
              Your PDF has been converted to Bloom format.
            </p>
            <button
              onClick={downloadResult}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
            >
              <Download className="mr-2" size={16} />
              Download HTML
            </button>
          </div>
        )}

        {conversionState.status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Conversion Failed
            </h3>
            <p className="text-red-700">{conversionState.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
