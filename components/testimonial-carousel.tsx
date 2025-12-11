
"use client"
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star } from "lucide-react"

export function TestimonialCarousel() {
    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Marketing Director",
            company: "TechFlow",
            content: "This platform has revolutionized how we manage our social media. The analytics are incredible.",
            initials: "SJ"
        },
        {
            name: "Michael Chen",
            role: "Founder",
            company: "StartUp Inc",
            content: "The best investment we've made this year. It saves us hours every week.",
            initials: "MC"
        },
        {
            name: "Emily Davis",
            role: "Social Media Manager",
            company: "Creative Agency",
            content: "Simple, intuitive, and powerful. Exactly what we needed to scale our operations.",
            initials: "ED"
        },
        {
            name: "David Wilson",
            role: "CEO",
            company: "Growth Co",
            content: "Support is top-notch and the features keep getting better. Highly recommended!",
            initials: "DW"
        },
        {
            name: "Jessica Lee",
            role: "Content Creator",
            company: "Viral Studios",
            content: "I love the new AI features. They help me come up with content ideas instantly.",
            initials: "JL"
        }
    ]

    return (
        <Carousel
            opts={{
                align: "start",
                loop: true,
            }}
            className="w-full max-w-5xl mx-auto"
        >
            <CarouselContent>
                {testimonials.map((testimonial, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 pl-4">
                        <div className="p-1 h-full">
                            <Card className="h-full border-muted/20 bg-muted/5 hover:bg-muted/10 transition-colors">
                                <CardContent className="flex flex-col p-6 h-full">
                                    <div className="flex gap-1 mb-4 text-yellow-500">6069
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="size-4 fill-current" />
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground flex-1 mb-6">"{testimonial.content}"</p>
                                    <div className="flex items-center gap-3 mt-auto">
                                        <Avatar>
                                            <AvatarImage src={`/avatars/${index + 1}.png`} alt={testimonial.name} />
                                            <AvatarFallback>{testimonial.initials}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold text-sm">{testimonial.name}</div>
                                            <div className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    )
}
