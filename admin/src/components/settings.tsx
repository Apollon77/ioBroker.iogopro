import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { CreateCSSProperties } from '@material-ui/core/styles/withStyles';
import I18n from '@iobroker/adapter-react/i18n';
import {
    Box,
    TextField,
    Tab,
    Tabs,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
} from '@material-ui/core';
import BlockIcon from '@material-ui/icons/Block';
import GroupIcon from '@material-ui/icons/Group';
import PersonIcon from '@material-ui/icons/Person';
import PropTypes from 'prop-types';
import Connection from '@iobroker/adapter-react/Connection';

export interface EnumConfig {
    name: string;
    visible?: 'none' | 'admin' | 'all';
}

const getName = (name: ioBroker.StringOrTranslated, systemLanguage: ioBroker.Languages = 'en'): string => {
    if (typeof name === 'string') {
        return name;
    } else if (typeof name === 'object' && systemLanguage in name && name[systemLanguage]) {
        return name[systemLanguage] as string;
    } else if (typeof name === 'object' && 'en' in name && name.en) {
        return name.en;
    } else if (typeof name === 'object' && 'de' in name && name.de) {
        return name.de;
    } else {
        return name.toString();
    }
};

function TabPanel(props: { [x: string]: any; children: any; value: any; index: any }) {
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
    socket: Connection;
    systemConfig: Record<string, any>;

    onChange: (attr: string, value: any) => void;
}

interface SettingsState {
    // add your state properties here
    apikey: string;
    enums: Record<string, EnumConfig>;
    blockedEnumIds: string[];
    adminEnumIds: string[];
    tabIndex: number;
}

class Settings extends React.Component<SettingsProps, SettingsState> {
    constructor(props: SettingsProps) {
        super(props);
        this.state = {
            tabIndex: 0,
            apikey: '',
            blockedEnumIds:
                !this.props.native.blockedEnumIds || Object.keys(this.props.native.blockedEnumIds).length <= 0
                    ? ([] as string[])
                    : this.props.native.blockedEnumIds,
            adminEnumIds:
                !this.props.native.adminEnumIds || Object.keys(this.props.native.adminEnumIds).length <= 0
                    ? ([] as string[])
                    : this.props.native.adminEnumIds,
            enums: {} as Record<string, EnumConfig>,
        };
    }

    componentDidMount(): void {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.props.socket.getForeignObjects('*', 'enum').then((objects) => {
            const tmp = {};
            Object.keys(objects)
                .filter((key) => key.split('.').length > 2)
                .forEach((key) => {
                    const name = getName(objects[key].common.name, this.props.systemConfig.systemLanguage);
                    if (this.state.blockedEnumIds.includes(key)) {
                        tmp[key] = { name: name, visible: 'none' };
                    } else if (this.state.adminEnumIds.includes(key)) {
                        tmp[key] = { name: name, visible: 'admin' };
                    } else {
                        tmp[key] = { name: name, visible: 'all' };
                    }
                });
            console.log('enums: ' + JSON.stringify(Object.entries(tmp)));
            Object.keys(tmp)
                .filter((key) => !objects[key])
                .forEach((key) => delete tmp[key]);
            this.setState({
                ...this.state,
                enums: tmp,
            });
        });
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

    a11yProps(index: number) {
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
        const handleChange = (event: any, newValue: any) => {
            this.setState({
                tabIndex: newValue,
            });
        };

        return (
            <>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={value} onChange={handleChange.bind(this)} aria-label="basic tabs example">
                        <Tab label="General" {...this.a11yProps(0)} />
                        <Tab label="Enums" {...this.a11yProps(1)} />
                    </Tabs>
                </Box>
                <TabPanel value={value} index={0}>
                    <form className={this.props.classes.tab}>{this.renderInput('apikey', 'apikey', 'text')}</form>
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <div style={{ height: 'calc(100% - 180px)', overflow: 'scroll' }}>
                        <TableContainer className={this.props.classes.tab}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{'Name'}</TableCell>
                                        <TableCell>{'Sichtbarkeit'}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.entries(this.state.enums).map((item) => {
                                        return (
                                            // eslint-disable-next-line react/jsx-key
                                            <TableRow key={item[0]}>
                                                <TableCell>{item[1].name}</TableCell>
                                                <TableCell>
                                                    <IconButton onClick={() => this.changeVisible(item[0], 'none')}>
                                                        <Tooltip title="Block the enum">
                                                            <BlockIcon
                                                                color={
                                                                    item[1].visible != 'none' ? 'disabled' : 'inherit'
                                                                }
                                                                fontSize={
                                                                    item[1].visible != 'none' ? 'medium' : 'large'
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </IconButton>
                                                    <IconButton onClick={() => this.changeVisible(item[0], 'admin')}>
                                                        <Tooltip title="Make enum visible for admin only">
                                                            <PersonIcon
                                                                color={
                                                                    item[1].visible != 'admin' ? 'disabled' : 'inherit'
                                                                }
                                                                fontSize={
                                                                    item[1].visible != 'admin' ? 'medium' : 'large'
                                                                }
                                                            />
                                                        </Tooltip>
                                                    </IconButton>
                                                    <IconButton onClick={() => this.changeVisible(item[0], 'all')}>
                                                        <Tooltip title="Enum is visible for all">
                                                            <GroupIcon
                                                                color={
                                                                    item[1].visible != 'all' ? 'disabled' : 'inherit'
                                                                }
                                                                fontSize={item[1].visible != 'all' ? 'medium' : 'large'}
                                                            />
                                                        </Tooltip>
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>
                </TabPanel>
            </>
        );
    }
    changeVisible(id: string, value: 'none' | 'admin' | 'all' | undefined): void {
        if (!value) {
            return;
        }

        const enums: Record<string, EnumConfig> = this.state.enums;
        enums[id].visible = value;
        console.log('change enums: ' + JSON.stringify(Object.entries(enums)));

        const blocked = Object.entries(enums)
            .filter((item) => item[1].visible == 'none')
            .map((item) => item[0]);

        const admin = Object.entries(enums)
            .filter((item) => item[1].visible == 'admin')
            .map((item) => item[0]);

        console.log('change blocked: ' + JSON.stringify(blocked));
        console.log('change admin: ' + JSON.stringify(admin));

        this.props.onChange('blockedEnumIds', blocked);
        this.props.onChange('adminEnumIds', admin);

        this.setState({ ...this.state, blockedEnumIds: blocked, adminEnumIds: admin, enums: enums });
    }
}

export default withStyles(styles)(Settings);
