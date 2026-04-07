import { Component, output, signal } from '@angular/core';

interface Step {
  icon:    string;
  title:   string;
  desc:    string;
  detail:  string;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [],
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent {
  done = output<void>();

  currentStep = signal(0);

  readonly steps: Step[] = [
    {
      icon:   '👋',
      title:  '¡Bienvenido a RoomieMatch!',
      desc:   'Te ayudamos a encontrar el roomie ideal usando inteligencia artificial.',
      detail: 'Nuestro sistema analiza tus preferencias, presupuesto, hábitos y zona para recomendarte personas altamente compatibles contigo.',
    },
    {
      icon:   '🏠',
      title:  'Explorar perfiles',
      desc:   'En la sección "Explorar" verás perfiles ordenados por compatibilidad.',
      detail: 'El porcentaje que ves es calculado por un modelo híbrido que combina similitud de perfil con patrones de interacciones de otros usuarios. Dale ❤️ si te interesa o ✕ si no.',
    },
    {
      icon:   '💜',
      title:  'Mis Matches',
      desc:   'Cuando dos personas se dan like mutuamente, ¡es un match!',
      detail: 'En "Mis Matches" verás todas las personas con quienes hiciste match. Desde ahí puedes iniciar una conversación para coordinarse.',
    },
    {
      icon:   '💬',
      title:  'Chat en tiempo real',
      desc:   'Habla directamente con tus matches.',
      detail: 'El chat funciona en tiempo real. Puedes coordinar visitas, hablar de condiciones del cuarto y conocerte antes de tomar una decisión.',
    },
    {
      icon:   '⚙️',
      title:  'Personaliza tu matching',
      desc:   'En "Mi Perfil" puedes ajustar qué factores importan más para ti.',
      detail: 'Cada persona valora cosas distintas — quizás el presupuesto es lo más importante para ti, o quizás la zona. Ajusta los sliders y el algoritmo se adaptará a tus prioridades.',
    },
  ];

  get isLast(): boolean {
    return this.currentStep() === this.steps.length - 1;
  }

  next(): void {
    if (this.isLast) {
      this.done.emit();
    } else {
      this.currentStep.update(s => s + 1);
    }
  }

  prev(): void {
    this.currentStep.update(s => s - 1);
  }

  skip(): void {
    this.done.emit();
  }
}
