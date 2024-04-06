import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


// Import plotly.js
declare var Plotly: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, 
            MatTabsModule,
            MatSelectModule,
            MatButtonModule,
            MatFormFieldModule,
            BrowserAnimationsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'droplet-angular';
  isUpdatingGraph = false;

  experiments = ['Experiment 1', 'Experiment 2', 'Experiment 3']; // Example experiments
  selectedExperiment: string | null = null;
  
  constructor(private cdr: ChangeDetectorRef) {}

  ensureElement(id: string, callback: () => void) {
    const el = document.getElementById(id);
    if (el) {
      callback();
    } else {
      setTimeout(() => this.ensureElement(id, callback), 100); // Retry after 100ms
    }
  }

  ngAfterViewInit() {
    this.ensureElement('temperatureGraph', () => {
      this.initGraphs();
      setTimeout(() => this.updateGraph(), 1000); // Update graph after 1s (to avoid race)
    });
  }

  addNewExperiment() {
    const newExperimentName = prompt('Enter new experiment name:');
    if (newExperimentName) {
      this.experiments.push(newExperimentName);
      this.selectedExperiment = newExperimentName;
      this.cdr.detectChanges();
    }
  }

  initGraphs() {
    const layoutTemperature = {
      title: 'Temperature',
      xaxis: { title: 'Time' },
      yaxis: { title: 'Temperature (°C)' }
    };

    const layoutHumidity = {
      title: 'Relative Humidity',
      xaxis: { title: 'Time' },
      yaxis: { title: 'Humidity (%)' }
    };

    const config = { responsive: true };

    const dataTemperature = [{
      x: [],
      y: [],
      mode: 'lines+markers',
      name: 'Temperature',
      type: 'scatter'
    }];

    const dataHumidity = [{
      x: [],
      y: [],
      mode: 'lines+markers',
      name: 'Humidity',
      type: 'scatter'
    }];

    Plotly.newPlot('temperatureGraph', dataTemperature, layoutTemperature, config);
    Plotly.newPlot('humidityGraph', dataHumidity, layoutHumidity, config);
  }
  
  updateGraph() {
    if (!this.isUpdatingGraph) {
      this.isUpdatingGraph = true;
    } else {
      // If we're already updating, don't start another loop
      return;
    }

    const performUpdate = () => {
      fetch('/api/data')
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          const currentTime = new Date().toISOString();

          // Update temperature graph
          Plotly.extendTraces('temperatureGraph', {
            x: [[currentTime]],
            y: [[data.temperature]]
          }, [0]);

          // Update humidity graph
          Plotly.extendTraces('humidityGraph', {
            x: [[currentTime]],
            y: [[data.humidity]]
          }, [0]);

          setTimeout(() => this.updateGraph(), 1000); // Update graph every second
        })
        .finally(() => {
          if (this.isUpdatingGraph) {
            setTimeout(performUpdate, 1000); // Retry after 1s
          }
        });
    }

    performUpdate();
  }

  onTabChanged(event: any) {
    // When tab changes, decide whether to start or stop updating based on the active tab
    if (event.index === 1) {
      if (!this.isUpdatingGraph) {
        this.updateGraph();
      }
    } else {
      this.isUpdatingGraph = false; // Stop the update loop when leaving the tab
    }
  }
}