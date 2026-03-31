"use client"

import { useState, useRef } from "react"
import { Bold, Italic, Underline, Link, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

const PRESET_COLORS = [
    { name: "Negro", value: "#000000" },
    { name: "Gris", value: "#6B7280" },
    { name: "Rojo", value: "#DC2626" },
    { name: "Naranja", value: "#EA580C" },
    { name: "Amarillo", value: "#CA8A04" },
    { name: "Verde", value: "#16A34A" },
    { name: "Azul", value: "#2563EB" },
    { name: "Púrpura", value: "#9333EA" },
]

export function TextEditorBasic() {
    const editorRef = useRef<HTMLDivElement>(null)
    const [colorPopoverOpen, setColorPopoverOpen] = useState(false)

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
    }

    const handleBold = () => execCommand("bold")
    const handleItalic = () => execCommand("italic")
    const handleUnderline = () => execCommand("underline")

    const handleColorChange = (color: string) => {
        execCommand("foreColor", color)
        setColorPopoverOpen(false)
    }

    const handleLink = () => {
        const selection = window.getSelection()
        if (selection && selection.toString().trim()) {
            const url = prompt("Ingrese la URL:")
            if (url) {
                execCommand("createLink", url)
            }
        } else {
            alert("Por favor, seleccione el texto que desea convertir en enlace.")
        }
    }

    return (
        <div className="border border-border rounded-md overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBold}
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10 transition-colors"
                    title="Negrita"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleItalic}
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10 transition-colors"
                    title="Cursiva"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnderline}
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10 transition-colors"
                    title="Subrayado"
                >
                    <Underline className="h-4 w-4" />
                </Button>

                <div className="w-px h-5 bg-border mx-1" />

                <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted-foreground/10 transition-colors"
                            title="Color de texto"
                        >
                            <Palette className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                        <div className="grid grid-cols-4 gap-1">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => handleColorChange(color.value)}
                                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="w-px h-5 bg-border mx-1" />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLink}
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10 transition-colors"
                    title="Insertar enlace"
                >
                    <Link className="h-4 w-4" />
                </Button>
            </div>

            {/* Editor area */}
            <div
                ref={editorRef}
                contentEditable
                className="h-[200px] overflow-y-auto p-3 focus:outline-none text-sm"
                placeholder="Escriba aquí..."
                suppressContentEditableWarning
            />
        </div>
    )
}
