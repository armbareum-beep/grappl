import React, { useEffect, useRef } from 'react';

export const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouseX = 0;
        let mouseY = 0;
        let isMouseMoving = false;
        let mouseTimer: NodeJS.Timeout;

        // Configuration
        const PARTICLE_COUNT = 100; // Number of particles
        const CONNECTION_DISTANCE = 150; // Distance to connect particles
        const MOUSE_RADIUS = 120; // Reduced radius of mouse influence
        const PARTICLE_SPEED = 0.2; // Slower base speed

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            baseX: number;
            baseY: number;
            density: number;

            constructor(w: number, h: number) {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.baseX = this.x;
                this.baseY = this.y;
                this.vx = (Math.random() - 0.5) * PARTICLE_SPEED;
                this.vy = (Math.random() - 0.5) * PARTICLE_SPEED;
                this.size = Math.random() * 2 + 1;
                // Blue/Purple shades for the theme
                const colors = ['rgba(99, 102, 241, ', 'rgba(139, 92, 246, ', 'rgba(59, 130, 246, ']; // Indigo, Violet, Blue
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.density = (Math.random() * 30) + 1;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fillStyle = this.color + '0.8)';
                ctx.fill();
            }

            update(w: number, h: number) {
                // Base movement
                this.x += this.vx;
                this.y += this.vy;

                // Mouse interaction - Zero Gravity (Turbulence only)
                // Particles do NOT follow mouse. They just float.
                // Mouse presence introduces tiny chaotic turbulence, not attraction.
                if (isMouseMoving) {
                    const dx = mouseX - this.x;
                    const dy = mouseY - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < MOUSE_RADIUS) {
                        // Tiny turbulence/repulsion to simulate displacing dust
                        // No attraction.
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;

                        // slight gentle push away or random jiggle
                        const pushStrength = 0.005;
                        this.vx -= forceDirectionX * pushStrength;
                        this.vy -= forceDirectionY * pushStrength;
                    }
                }

                // Minimal Friction (Intertia dominates)
                this.vx *= 0.99;
                this.vy *= 0.99;

                // Keep particles moving
                // If velocity creates too slow movement, add base wander
                if (Math.abs(this.vx) < 0.1) this.vx += (Math.random() - 0.5) * 0.05;
                if (Math.abs(this.vy) < 0.1) this.vy += (Math.random() - 0.5) * 0.05;

                // Bounce off edges logic (optional, or wrap around)
                if (this.x < 0) this.x = w;
                if (this.x > w) this.x = 0;
                if (this.y < 0) this.y = h;
                if (this.y > h) this.y = 0;
            }
        }

        const init = () => {
            particles = [];
            const w = canvas.width;
            const h = canvas.height;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(new Particle(w, h));
            }
        };

        const animate = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update(w, h);
                particles[i].draw();

                // Draw connections
                // No lines between particles for cleaner look

                // No connection to mouse (Zero Gravity)
                // This ensures no visual "following" cues.
                // We only keep particle-to-particle connections.
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            } else {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
            isMouseMoving = true;

            // Reset timer
            clearTimeout(mouseTimer);
            mouseTimer = setTimeout(() => {
                isMouseMoving = false;
            }, 2000); // Stop influence after 2s of no movement
        };

        // Initialize
        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
            clearTimeout(mouseTimer);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ background: 'transparent' }}
        />
    );
};
