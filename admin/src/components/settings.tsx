import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { CreateCSSProperties } from '@material-ui/core/styles/withStyles';
import I18n from '@iobroker/adapter-react/i18n';
import {
    Box,
    FormControl,
    TextField,
    Input,
    Select,
    MenuItem,
    FormHelperText,
    IconButton,
    Tab,
    Tabs,
    Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import PropTypes from 'prop-types';

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <Typography
            component="div"
            role="tabpanel"
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            aria-labelledby={`scrollable-auto-tab-${index}`}
            {...other}
        >
            <Box p={3}>{children}</Box>
        </Typography>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

const styles = (): Record<string, CreateCSSProperties> => ({
    input: {
        marginTop: 20,
        marginLeft: 20,
        minWidth: 400,
    },
    button: {
        marginRight: 20,
    },
    card: {
        maxWidth: 345,
        textAlign: 'center',
    },
    media: {
        height: 180,
    },
    column: {
        display: 'inline-block',
        verticalAlign: 'top',
        marginRight: 20,
    },
    columnLogo: {
        width: 350,
        marginRight: 0,
    },
    columnSettings: {
        width: 'calc(100% - 370px)',
    },
    controlElement: {
        //background: "#d2d2d2",
        marginBottom: 5,
    },
});

interface SettingsProps {
    classes: Record<string, string>;
    native: ioBroker.AdapterConfig;

    onChange: (attr: string, value: any) => void;
}

interface SettingsState {
    // add your state properties here
    apikey: string;
    blockedEnumIds: string[];
    tabIndex: number;
}

class Settings extends React.Component<SettingsProps, SettingsState> {
    constructor(props: SettingsProps) {
        super(props);
        this.state = {
            tabIndex: 0,
            apikey: '',
            blockedEnumIds:
                !this.props.native.blockedEnumIds || !this.props.native.blockedEnumIds.length
                    ? [{} as string]
                    : [...this.props.native.blockedEnumIds],
        };
    }

    updateItemProperty(index: number, value: string) {
        if (index < 0 || !value) {
            return;
        }
        const blockedEnumIds: string[] = [...this.state.blockedEnumIds];
        blockedEnumIds[index] = value;
        this.props.onChange('blockedEnumIds', blockedEnumIds);
        this.setState({ ...this.state, blockedEnumIds: blockedEnumIds });
    }

    appendRow() {
        const blockedEnumIds = [...this.state.blockedEnumIds, '' as string];
        this.props.onChange('blockedEnumIds', blockedEnumIds);
        this.setState({
            blockedEnumIds: blockedEnumIds,
        });
    }

    deleteRow(index: number) {
        if (isNaN(index) || index < 0) return;
        const blockedEnumIds: string[] = [...this.state.blockedEnumIds].filter((item, i) => i !== index);
        this.props.onChange('blockedEnumIds', blockedEnumIds);
        this.setState({ ...this.state, blockedEnumIds: blockedEnumIds });
    }

    renderInput(title: AdminWord, attr: string, type: string) {
        return (
            <TextField
                label={I18n.t(title)}
                className={`${this.props.classes.input} ${this.props.classes.controlElement}`}
                value={this.props.native[attr]}
                type={type || 'text'}
                onChange={(e) => this.props.onChange(attr, e.target.value)}
                margin="normal"
                multiline
                rows={7}
                variant="outlined"
            />
        );
    }

    renderInputEnum(index: number) {
        return (
            <TextField
                //label={I18n.t(title)}
                className={`${this.props.classes.input} ${this.props.classes.controlElement}`}
                style={{ marginLeft: 10, marginRight: 10 }}
                value={this.state.blockedEnumIds[index] || ''}
                type={'text'}
                onChange={(e) => this.updateItemProperty(index, e.target.value)}
                key={index}
                margin="normal"
            />
        );
    }

    renderSelect(
        title: AdminWord,
        attr: string,
        options: { value: string; title: AdminWord }[],
        style?: React.CSSProperties,
    ) {
        return (
            <FormControl
                className={`${this.props.classes.input} ${this.props.classes.controlElement}`}
                style={{
                    paddingTop: 5,
                    ...style,
                }}
            >
                <Select
                    value={this.props.native[attr] || '_'}
                    onChange={(e) => this.props.onChange(attr, e.target.value === '_' ? '' : e.target.value)}
                    input={<Input name={attr} id={attr + '-helper'} />}
                >
                    {options.map((item) => (
                        <MenuItem key={'key-' + item.value} value={item.value || '_'}>
                            {I18n.t(item.title)}
                        </MenuItem>
                    ))}
                </Select>
                <FormHelperText>{I18n.t(title)}</FormHelperText>
            </FormControl>
        );
    }

    a11yProps(index) {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
        };
    }

    handleTabChange(_event: React.ChangeEvent<any>, newValue: number): void {
        this.setState({ tabIndex: newValue });
    }

    render() {
        const value = this.state.tabIndex;
        const handleChange = (event, newValue) => {
            this.setState({
                tabIndex: newValue,
            });
        };

        return (
            <>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={value} onChange={handleChange.bind(this)} aria-label="basic tabs example">
                        <Tab label="General" {...this.a11yProps(0)} />
                        <Tab label="Blocked Enums" {...this.a11yProps(1)} />
                    </Tabs>
                </Box>
                <TabPanel value={value} index={0}>
                    <form className={this.props.classes.tab}>{this.renderInput('apikey', 'apikey', 'text')}</form>
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <div>
                        <div style={{ padding: 20, height: 'calc(100% - 50px)', overflow: 'scroll' }}>
                            {this.state.blockedEnumIds.map((item, i) => (
                                <div style={{ marginTop: 20 }} key={i}>
                                    {this.renderInputEnum(i)}
                                    <IconButton onClick={() => this.deleteRow(i)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </div>
                            ))}
                            <IconButton onClick={() => this.appendRow()}>
                                <AddIcon />
                            </IconButton>
                        </div>
                    </div>
                </TabPanel>
            </>
        );
    }
}

export default withStyles(styles)(Settings);
