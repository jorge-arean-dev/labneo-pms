"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Bold, Italic, Underline, Link, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  { name: "Negro", value: "#000000" },
  { name: "Gris", value: "#6B7280" },
  { name: "Rojo", value: "#DC2626" },
  { name: "Naranja", value: "#EA580C" },
  { name: "Amarillo", value: "#CA8A04" },
  { name: "Verde", value: "#16A34A" },
  { name: "Azul", value: "#2563EB" },
  { name: "Violeta", value: "#9333EA" },
]

interface RichTextEditorProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  disabled?: boolean
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = "Escriba aquí...",
  rows = 8,
  className,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  const [savedSelection, setSavedSelection] = useState<Range | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value
      setIsInitialized(true)
    }
  }, [value, isInitialized])

  // Update content when value changes externally (e.g., form reset)
  useEffect(() => {
    if (editorRef.current && isInitialized) {
      const currentContent = editorRef.current.innerHTML
      if (currentContent !== value) {
        editorRef.current.innerHTML = value
      }
    }
  }, [value, isInitialized])

  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0).cloneRange())
    }
  }, [])

  const restoreSelection = useCallback(() => {
    if (savedSelection) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(savedSelection)
      }
    }
  }, [savedSelection])

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()

    // Trigger onChange after command
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleBold = () => execCommand("bold")
  const handleItalic = () => execCommand("italic")
  const handleUnderline = () => execCommand("underline")

  const handleColorChange = (color: string) => {
    execCommand("foreColor", color)
    setColorPopoverOpen(false)
  }

  const handleLinkClick = () => {
    saveSelection()
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setLinkText(selection.toString())
    } else {
      setLinkText("")
    }
    setLinkUrl("")
    setLinkDialogOpen(true)
  }

  const handleLinkInsert = () => {
    if (!linkUrl.trim()) return

    restoreSelection()
    editorRef.current?.focus()

    // Small delay to ensure focus is restored
    setTimeout(() => {
      const selection = window.getSelection()

      if (linkText.trim() && (!selection || selection.toString().trim() === "")) {
        // No selection, insert link with text
        const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563EB; text-decoration: underline;">${linkText}</a>`
        document.execCommand("insertHTML", false, linkHtml)
      } else {
        // Wrap selected text with link
        document.execCommand("createLink", false, linkUrl)

        // Style the link
        const selection = window.getSelection()
        if (selection && selection.anchorNode) {
          const linkElement = selection.anchorNode.parentElement
          if (linkElement?.tagName === "A") {
            linkElement.setAttribute("target", "_blank")
            linkElement.setAttribute("rel", "noopener noreferrer")
            linkElement.style.color = "#2563EB"
            linkElement.style.textDecoration = "underline"
          }
        }
      }

      // Trigger onChange
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }

      setLinkDialogOpen(false)
      setLinkUrl("")
      setLinkText("")
    }, 10)
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault()
          handleBold()
          break
        case "i":
          e.preventDefault()
          handleItalic()
          break
        case "u":
          e.preventDefault()
          handleUnderline()
          break
      }
    }
  }

  // Calculate min-height based on rows
  const minHeight = rows * 24 // Approximate line height

  return (
    <TooltipProvider>
      <div className={cn("border border-input rounded-md overflow-hidden", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-input bg-muted/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBold}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                aria-label="Negrita (Ctrl+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Negrita (Ctrl+B)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleItalic}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                aria-label="Cursiva (Ctrl+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cursiva (Ctrl+I)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUnderline}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                aria-label="Subrayado (Ctrl+U)"
              >
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Subrayado (Ctrl+U)</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                    aria-label="Color de texto"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Color de texto</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-4 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleColorChange(color.value)}
                    className="w-6 h-6 rounded border border-input hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    aria-label={`Color ${color.name}`}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLinkClick}
                disabled={disabled}
                className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                aria-label="Insertar enlace"
              >
                <Link className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Insertar enlace</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Editor area */}
        <div
          ref={editorRef}
          id={id}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={saveSelection}
          className={cn(
            "overflow-y-auto p-3 focus:outline-none",
            "prose max-w-none",
            "[&_a]:text-blue-600 [&_a]:underline",
            disabled && "opacity-50 cursor-not-allowed bg-muted/30"
          )}
          style={{ minHeight: `${minHeight}px`, fontSize: "16px", lineHeight: "1.5" }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Editor de texto"
        />

        {/* Link Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Insertar enlace</DialogTitle>
              <DialogDescription>
                Ingrese la URL y opcionalmente el texto a mostrar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://ejemplo.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleLinkInsert()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-text">Texto a mostrar (opcional)</Label>
                <Input
                  id="link-text"
                  type="text"
                  placeholder="Texto del enlace"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleLinkInsert()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Si hay texto seleccionado, se usará como texto del enlace.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleLinkInsert}
                disabled={!linkUrl.trim()}
              >
                Insertar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* CSS for placeholder */}
      <style jsx global>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </TooltipProvider>
  )
}
