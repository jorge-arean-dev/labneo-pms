"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingCart, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type Currency = "ARS" | "USD"

interface Item {
    id: string
    nombre: string
    tiempoDeEntrega: string
    moneda: Currency
    precio: number
}

const sampleItems: Item[] = [
    {
        id: "1",
        nombre: "Teclado Mecánico RGB",
        tiempoDeEntrega: "2-3 días",
        moneda: "USD",
        precio: 89.99,
    },
    {
        id: "2",
        nombre: "Mouse Inalámbrico Ergonómico",
        tiempoDeEntrega: "1-2 días",
        moneda: "USD",
        precio: 45.50,
    },
    {
        id: "3",
        nombre: "Monitor 27 pulgadas 4K",
        tiempoDeEntrega: "5-7 días",
        moneda: "ARS",
        precio: 450000,
    },
    {
        id: "4",
        nombre: "Auriculares Bluetooth",
        tiempoDeEntrega: "3-4 días",
        moneda: "USD",
        precio: 129.99,
    },
    {
        id: "5",
        nombre: "Webcam Full HD",
        tiempoDeEntrega: "2-3 días",
        moneda: "ARS",
        precio: 85000,
    },
    {
        id: "6",
        nombre: "Hub USB-C 7 en 1",
        tiempoDeEntrega: "1-2 días",
        moneda: "USD",
        precio: 35.00,
    },
]

function formatPrice(precio: number, moneda: Currency): string {
    if (moneda === "USD") {
        return `US$ ${precio.toFixed(2)}`
    }
    return `$ ${precio.toLocaleString("es-AR")}`
}

export function ItemList() {
    const [quantities, setQuantities] = useState<Record<string, number>>(
        Object.fromEntries(sampleItems.map((item) => [item.id, 0]))
    )

    const updateQuantity = (id: string, delta: number) => {
        setQuantities((prev) => ({
            ...prev,
            [id]: Math.max(0, prev[id] + delta),
        }))
    }

    const selectedItems = sampleItems.filter((item) => quantities[item.id] > 0)

    const totalsByMoney = selectedItems.reduce(
        (acc, item) => {
            const subtotal = item.precio * quantities[item.id]
            acc[item.moneda] = (acc[item.moneda] || 0) + subtotal
            return acc
        },
        {} as Record<Currency, number>
    )

    const totalItems = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
                <header className="flex flex-col gap-2">
                    <h1 className="text-2xl font-semibold text-foreground">Productos Disponibles</h1>
                    <p className="text-muted-foreground text-sm">
                        Selecciona la cantidad de cada producto que deseas agregar.
                    </p>
                </header>

                <div className="flex flex-col gap-3">
                    {sampleItems.map((item) => (
                        <Card key={item.id} className="py-4">
                            <CardContent className="p-0 px-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <h3 className="font-medium text-foreground">{item.nombre}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Truck className="size-4" />
                                            <span>{item.tiempoDeEntrega}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <Badge variant="outline" className="text-xs">
                                                {item.moneda}
                                            </Badge>
                                            <span className="font-semibold text-foreground">
                                                {formatPrice(item.precio, item.moneda)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={() => updateQuantity(item.id, -1)}
                                                disabled={quantities[item.id] === 0}
                                                aria-label={`Disminuir cantidad de ${item.nombre}`}
                                            >
                                                <Minus className="size-4" />
                                            </Button>
                                            <span className="w-8 text-center font-medium text-foreground tabular-nums">
                                                {quantities[item.id]}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={() => updateQuantity(item.id, 1)}
                                                aria-label={`Aumentar cantidad de ${item.nombre}`}
                                            >
                                                <Plus className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="bg-muted/50">
                    <CardHeader className="pb-0">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShoppingCart className="size-5" />
                            Resumen del Carrito
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {totalItems === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No has seleccionado ningún producto todavía.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <ul className="flex flex-col gap-2">
                                    {selectedItems.map((item) => (
                                        <li
                                            key={item.id}
                                            className="flex justify-between items-center text-sm"
                                        >
                                            <span className="text-foreground">
                                                {item.nombre}{" "}
                                                <span className="text-muted-foreground">
                                                    x{quantities[item.id]}
                                                </span>
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {formatPrice(
                                                    item.precio * quantities[item.id],
                                                    item.moneda
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="border-t pt-3 flex flex-col gap-1">
                                    <p className="text-sm text-muted-foreground">
                                        {totalItems} {totalItems === 1 ? "producto" : "productos"} seleccionados
                                    </p>
                                    {totalsByMoney.USD !== undefined && totalsByMoney.USD > 0 && (
                                        <p className="text-base font-semibold text-foreground">
                                            Total USD: {formatPrice(totalsByMoney.USD, "USD")}
                                        </p>
                                    )}
                                    {totalsByMoney.ARS !== undefined && totalsByMoney.ARS > 0 && (
                                        <p className="text-base font-semibold text-foreground">
                                            Total ARS: {formatPrice(totalsByMoney.ARS, "ARS")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
