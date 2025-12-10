
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
                        <div className="p-2 h-full relative group perspective-1000">
                            {/* Glow Effect */}
                            <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 to-orange-500/30 rounded-xl blur opacity-0 group-hover:opacity-50 transition duration-500"></div>

                            {/* Card with 3D animation */}
                            <Card className="relative h-full border-muted/20 bg-card/60 backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:-rotate-1  z-10">
                                <CardContent className="flex flex-col p-6 h-full">
                                    <div className="flex gap-1 mb-4 text-yellow-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="size-4 fill-current" />
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground flex-1 mb-6 italic leading-relaxed">"{testimonial.content}"</p>
                                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-muted/10">
                                        <Avatar className="ring-2 ring-primary/10">
                                            <AvatarImage src={`/avatars/${index + 1}.png`} alt={testimonial.name} />
                                            <AvatarFallback className="bg-primary/5 text-primary font-bold">{testimonial.initials}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{testimonial.name}</div>
                                            <div className="text-xs text-muted-foreground font-medium">{testimonial.role}, {testimonial.company}</div>
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
