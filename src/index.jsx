import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class Calculator extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            estimateLines: [
                EstimateLine.createDefault(),
            ],
        };
    }

    addLine() {
        const lastCopy = this.state.estimateLines[this.state.estimateLines.length - 1];
        this.setState({
            estimateLines: this.state.estimateLines.concat(lastCopy || EstimateLine.createDefault()),
        });
    }

    /**
     * @param {number} i 行のインデックス
     */
    removeLineAt(i) {
        const copy = this.state.estimateLines.concat();
        copy.splice(i, 1);
        this.setState({
            estimateLines: copy,
        });
    }

    /**
     * @param {number} i 行のインデックス
     * @param {EstimateLine} newLine
     */
    replaceLineAt(i, newLine) {
        const copy = this.state.estimateLines.concat();
        copy[i] = newLine;

        this.setState({
            estimateLines: copy,
        });
    }

    /**
     * @param {number} i 行のインデックス
     */
    createTaskNameChangeHandler(i) {
        return (event) => this.replaceLineAt(i, this.state.estimateLines[i].withTaskName(event.target.value));
    }

    /**
     * @param {number} i 行のインデックス
     */
    createOptimisticChangeHandler(i) {
        return (event) => this.replaceLineAt(i, this.state.estimateLines[i].withOptimistic(Number(event.target.value)));
    }

    /**
     * @param {number} i 行のインデックス
     */
    createNominalChangeHandler(i) {
        return (event) => this.replaceLineAt(i, this.state.estimateLines[i].withNominal(Number(event.target.value)));
    }

    /**
     * @param {number} i 行のインデックス
     */
    createPessimisticChangeHandler(i) {
        return (event) => this.replaceLineAt(i, this.state.estimateLines[i].withPessimistic(Number(event.target.value)));
    }

    render() {
        return (
            <div className="calculator">
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>#</th>
                            <th>タスク名</th>
                            <th>楽観的見積もり<br />(O, &lt;1%)</th>
                            <th>平均的見積もり<br />(N)</th>
                            <th>悲観的見積もり<br />(P, &lt;1%)</th>
                            <th>期待値<br />(μ)</th>
                            <th>標準偏差<br />(σ)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.estimateLines.map((estimateLine, i) => {
                            return (
                                <Line key={i}
                                    onRemoveRequested={() => this.removeLineAt(i)}
                                    lineNumber={i + 1}
                                    lineData={estimateLine}
                                    onTaskNameChange={this.createTaskNameChangeHandler(i)}
                                    onOptimisticChange={this.createOptimisticChangeHandler(i)}
                                    onNominalChange={this.createNominalChangeHandler(i)}
                                    onPessimisticChange={this.createPessimisticChangeHandler(i)}
                                />
                            );
                        })}
                        {this.renderSummary()}
                    </tbody>
                </table>
                <button onClick={() => this.addLine()}>+</button>
            </div>
        );
    }

    renderSummary() {
        if (this.state.estimateLines.length === 0) {
            return null;
        }

        return (
            <Summary taskName="合計"
                mu={this.summaryMu()}
                sigma={this.summarySigma()}
            />
        );
    }

    summaryMu() {
        if (!this.allLinesValid()) {
            return null;
        }

        return this.state.estimateLines.reduce((mu, estimateLine) => {
            return mu + estimateLine.mu();
        }, 0)
    }

    summarySigma() {
        if (!this.allLinesValid()) {
            return null;
        }

        return Math.sqrt(
            this.state.estimateLines.reduce((squaredSigma, estimateLine) => {
                return squaredSigma + estimateLine.sigma() ** 2;
            }, 0)
        );
    }

    allLinesValid() {
        return this.state.estimateLines.every((estimateLine) => estimateLine.isValid());
    }

    validLines() {
        return this.state.estimateLines.filter((estimateLine) => estimateLine.isValid());
    }
}

function Line(props) {
    return (
        <tr >
            <td>
                <button onClick={props.onRemoveRequested}>-</button>
            </td>
            <td>{props.lineNumber}</td>
            <td><input type="text"
                value={props.lineData.taskName}
                onChange={props.onTaskNameChange}
            /></td>
            <td><input type="number"
                value={props.lineData.optimistic}
                onChange={props.onOptimisticChange}
            /></td>
            <td><input type="number"
                value={props.lineData.nominal}
                onChange={props.onNominalChange}
            /></td>
            <td><input type="number"
                onChange={props.onPessimisticChange}
                value={props.lineData.pessimistic} /></td>
            <td><Mu value={props.lineData.mu()} /></td>
            <td><Sigma value={props.lineData.sigma()} /></td>
        </tr>
    );
}

function Summary(props) {
    return (
        <tr >
            <td></td>
            <td></td>
            <td>{props.taskName}</td>
            <td></td>
            <td></td>
            <td></td>
            <td><Mu value={props.mu} /></td>
            <td><Sigma value={props.sigma} /></td>
        </tr>
    );
}

function Mu(props) {
    const mu = props.value === null ? '-' : Number(props.value).toFixed(1);
    return (
        <output>{mu}</output>
    );
}

function Sigma(props) {
    const sigma = props.value === null ? '-' : Number(props.value).toFixed(1);
    return (
        <output>{sigma}</output>
    );
}


class EstimateLine {
    taskName = 'task';
    optimistic = 1;
    nominal = 1;
    pessimistic = 1;

    constructor(taskName, optimistic, nominal, pessimistic) {
        this.taskName = taskName;
        this.optimistic = optimistic;
        this.nominal = nominal;
        this.pessimistic = pessimistic;
    }
    isValid() {
        return 0 < this.optimistic
            && this.optimistic <= this.nominal
            && this.nominal <= this.pessimistic;

    }

    mu() {
        if (!this.isValid()) {
            return null;
        }

        return (this.optimistic + 4 * this.nominal + this.pessimistic) / 6.0;
    }

    sigma() {
        if (!this.isValid()) {
            return null;
        }

        return (this.pessimistic - this.optimistic) / 6.0;
    }

    /**
     * @param {string} taskName
     */
    withTaskName(taskName) {
        const newLine = this.clone();
        newLine.taskName = taskName;
        return newLine;
    }

    /**
     * @param {number} optimistic
     */
    withOptimistic(optimistic) {
        const newLine = this.clone();
        newLine.optimistic = optimistic;
        return newLine;
    }

    /**
     * @param {number} nominal
     */
    withNominal(nominal) {
        const newLine = this.clone();
        newLine.nominal = nominal;
        return newLine;
    }

    /**
     * @param {number} pessimistic
     */
    withPessimistic(pessimistic) {
        const newLine = this.clone();
        newLine.pessimistic = pessimistic;
        return newLine;
    }

    clone() {
        return new EstimateLine(
            this.taskName,
            this.optimistic,
            this.nominal,
            this.pessimistic
        );
    }

    static createDefault() {
        return new EstimateLine('task', 1, 1, 1);
    }
}
// ========================================
ReactDOM.render(
    <Calculator />,
    document.getElementById('root')
);
